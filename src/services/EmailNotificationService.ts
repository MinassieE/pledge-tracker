/**
 * Email Notification Service for Project Assignments
 * 
 * This service handles sending email notifications when users are assigned to projects.
 * It determines whether to send an account creation email (for new users) or a project
 * invitation email (for existing users) based on user existence in the database.
 * 
 * Requirements: 3.6, 3.7, 8.7
 */

import nodemailer from 'nodemailer';
import { Admin, IAdmin } from '../modules/admin';
import {
  generateAccountCreationEmail,
  generateAccountCreationEmailPlainText,
  AccountCreationEmailParams,
} from '../templates/accountCreationEmail';
import {
  generateProjectInvitationEmail,
  generateProjectInvitationEmailPlainText,
  ProjectInvitationEmailParams,
} from '../templates/projectInvitationEmail';

/**
 * Configuration for email retry logic
 */
const EMAIL_RETRY_CONFIG = {
  maxRetries: 3,
  retryDelayMs: 1000,
  backoffMultiplier: 2,
};

/**
 * Parameters for sending account creation email
 */
export interface SendAccountCreationEmailParams {
  email: string;
  password: string;
  firstName: string;
  middleName: string;
  role: 'admin' | 'followUp';
  loginUrl?: string;
}

/**
 * Parameters for sending project invitation email
 */
export interface SendProjectInvitationEmailParams {
  email: string;
  firstName: string;
  middleName: string;
  projectName: string;
  role: 'admin' | 'followUp';
  loginUrl?: string;
}

/**
 * Email Notification Service
 * 
 * Handles all email notifications related to project assignments
 */
export class EmailNotificationService {
  private transporter: nodemailer.Transporter;
  private defaultLoginUrl: string;

  constructor() {
    // Initialize nodemailer transporter with Gmail SMTP
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // use TLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Default login URL (can be overridden in method calls)
    this.defaultLoginUrl = process.env.APP_URL || 'http://localhost:3000/login';
  }

  /**
   * Sends an account creation email to a new user
   * 
   * This email includes login credentials.
   * User will be notified separately when assigned to projects.
   * 
   * @param params - Account creation email parameters
   * @throws Error if email sending fails after all retries
   * 
   * Requirements: 3.6, 8.1, 8.2, 8.3
   */
  async sendAccountCreationEmail(params: SendAccountCreationEmailParams): Promise<void> {
    const {
      email,
      password,
      firstName,
      middleName,
      role,
      loginUrl = this.defaultLoginUrl,
    } = params;

    const emailParams: AccountCreationEmailParams = {
      firstName,
      middleName,
      email,
      password,
      role,
      loginUrl,
    };

    const htmlContent = generateAccountCreationEmail(emailParams);
    const textContent = generateAccountCreationEmailPlainText(emailParams);

    const mailOptions = {
      from: '"NCIC Pledge Follow-up" <no-reply@NCIC.com>',
      to: email,
      subject: 'Welcome to Pledge Tracker - Account Created',
      text: textContent,
      html: htmlContent,
    };

    await this.sendEmailWithRetry(mailOptions, 'account creation');
  }

  /**
   * Sends a project invitation email to an existing user
   * 
   * This email notifies the user of their new project assignment.
   * Does NOT include login credentials.
   * 
   * @param params - Project invitation email parameters
   * @throws Error if email sending fails after all retries
   * 
   * Requirements: 3.7, 3.8, 8.4, 8.5, 8.6
   */
  async sendProjectInvitationEmail(params: SendProjectInvitationEmailParams): Promise<void> {
    const {
      email,
      firstName,
      middleName,
      projectName,
      role,
      loginUrl = this.defaultLoginUrl,
    } = params;

    const emailParams: ProjectInvitationEmailParams = {
      firstName,
      middleName,
      projectName,
      role,
      loginUrl,
    };

    const htmlContent = generateProjectInvitationEmail(emailParams);
    const textContent = generateProjectInvitationEmailPlainText(emailParams);

    const mailOptions = {
      from: '"NCIC Pledge Follow-up" <no-reply@NCIC.com>',
      to: email,
      subject: `New Project Assignment - ${projectName}`,
      text: textContent,
      html: htmlContent,
    };

    await this.sendEmailWithRetry(mailOptions, 'project invitation');
  }

  /**
   * Checks if a user exists in the database and sends the appropriate email
   * 
   * - If user exists: sends project invitation email
   * - If user doesn't exist: sends account creation email
   * 
   * This method implements the user existence check logic required by Requirement 8.7.
   * 
   * @param email - User's email address
   * @param userData - User data for email personalization
   * @param projectName - Name of the project being assigned
   * @param role - User's role in the project
   * @param password - Password for new users (required if user doesn't exist)
   * @param loginUrl - Optional custom login URL
   * @throws Error if user doesn't exist and no password is provided
   * @throws Error if email sending fails
   * 
   * Requirements: 8.7
   */
  async sendProjectAssignmentEmail(
    email: string,
    userData: {
      firstName: string;
      middleName: string;
    },
    projectName: string,
    role: 'admin' | 'followUp',
    password?: string,
    loginUrl?: string,
  ): Promise<void> {
    try {
      // Check if user exists in the database
      const existingUser = await Admin.findOne({ email: email.toLowerCase() });

      if (existingUser) {
        // User exists - send project invitation email
        await this.sendProjectInvitationEmail({
          email,
          firstName: existingUser.first_name,
          middleName: existingUser.middle_name,
          projectName,
          role,
          loginUrl,
        });
      } else {
        // User doesn't exist - send account creation email
        if (!password) {
          throw new Error('Password is required for new user account creation');
        }

        await this.sendAccountCreationEmail({
          email,
          password,
          firstName: userData.firstName,
          middleName: userData.middleName,
          role,
          loginUrl,
        });
      }
    } catch (error) {
      // Log the error but don't throw - email failures shouldn't block user assignment
      console.error(`Failed to send project assignment email to ${email}:`, error);
      throw error;
    }
  }

  /**
   * Sends an email with retry logic and exponential backoff
   * 
   * Implements error handling and retry mechanism for failed email deliveries.
   * 
   * @param mailOptions - Nodemailer mail options
   * @param emailType - Type of email being sent (for logging)
   * @throws Error if all retry attempts fail
   */
  private async sendEmailWithRetry(
    mailOptions: nodemailer.SendMailOptions,
    emailType: string,
  ): Promise<void> {
    let lastError: Error | null = null;
    let delay = EMAIL_RETRY_CONFIG.retryDelayMs;

    for (let attempt = 1; attempt <= EMAIL_RETRY_CONFIG.maxRetries; attempt++) {
      try {
        await this.transporter.sendMail(mailOptions);
        console.log(`Successfully sent ${emailType} email to ${mailOptions.to} (attempt ${attempt})`);
        return; // Success - exit the function
      } catch (error) {
        lastError = error as Error;
        console.error(
          `Failed to send ${emailType} email to ${mailOptions.to} (attempt ${attempt}/${EMAIL_RETRY_CONFIG.maxRetries}):`,
          error,
        );

        // If this wasn't the last attempt, wait before retrying
        if (attempt < EMAIL_RETRY_CONFIG.maxRetries) {
          await this.sleep(delay);
          delay *= EMAIL_RETRY_CONFIG.backoffMultiplier; // Exponential backoff
        }
      }
    }

    // All retries failed
    throw new Error(
      `Failed to send ${emailType} email after ${EMAIL_RETRY_CONFIG.maxRetries} attempts: ${lastError?.message}`,
    );
  }

  /**
   * Helper method to sleep for a specified duration
   * 
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Verifies the email transporter configuration
   * 
   * Useful for testing email service connectivity
   * 
   * @returns Promise that resolves if connection is successful
   * @throws Error if connection fails
   */
  async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
      console.log('Email service connection verified successfully');
    } catch (error) {
      console.error('Email service connection verification failed:', error);
      throw new Error('Failed to verify email service connection');
    }
  }
}

// Export a singleton instance for convenience
export const emailNotificationService = new EmailNotificationService();
