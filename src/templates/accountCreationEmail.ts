/**
 * Email template for new user account creation
 * Sent when a new admin or follow-up user account is created
 * 
 * Requirements: 3.6, 8.1, 8.2, 8.3
 */

export interface AccountCreationEmailParams {
  firstName: string;
  middleName: string;
  email: string;
  password: string;
  role: 'admin' | 'followUp';
  loginUrl: string;
}

/**
 * Generates HTML email content for new user account creation
 * 
 * @param params - Account creation email parameters
 * @returns HTML string for the email body
 */
export function generateAccountCreationEmail(params: AccountCreationEmailParams): string {
  const { firstName, middleName, email, password, role, loginUrl } = params;
  
  const roleDisplay = role === 'admin' ? 'Administrator' : 'Follow-Up User';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Pledge Tracker</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #4CAF50;
      color: white;
      padding: 20px;
      text-align: center;
      border-radius: 5px 5px 0 0;
    }
    .content {
      background-color: #f9f9f9;
      padding: 30px;
      border: 1px solid #ddd;
      border-top: none;
      border-radius: 0 0 5px 5px;
    }
    .credentials-box {
      background-color: #fff;
      border: 2px solid #4CAF50;
      border-radius: 5px;
      padding: 20px;
      margin: 20px 0;
    }
    .credential-item {
      margin: 10px 0;
      padding: 10px;
      background-color: #f5f5f5;
      border-radius: 3px;
    }
    .credential-label {
      font-weight: bold;
      color: #555;
    }
    .credential-value {
      font-family: monospace;
      color: #000;
      font-size: 14px;
    }
    .warning {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
    }
    .info-box {
      background-color: #e3f2fd;
      border-left: 4px solid #2196F3;
      padding: 15px;
      margin: 20px 0;
    }
    .button {
      display: inline-block;
      background-color: #4CAF50;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      color: #777;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Welcome to Pledge Tracker!</h1>
  </div>
  
  <div class="content">
    <p>Hello ${firstName} ${middleName},</p>
    
    <p>Your account has been created in the Pledge Tracker system as a <strong>${roleDisplay}</strong>.</p>
    
    <div class="credentials-box">
      <h3 style="margin-top: 0; color: #4CAF50;">Your Login Credentials</h3>
      
      <div class="credential-item">
        <div class="credential-label">Email:</div>
        <div class="credential-value">${email}</div>
      </div>
      
      <div class="credential-item">
        <div class="credential-label">Temporary Password:</div>
        <div class="credential-value">${password}</div>
      </div>
    </div>
    
    <div class="warning">
      <strong>⚠️ Important Security Notice:</strong>
      <p style="margin: 10px 0 0 0;">Please change your password immediately after your first login. Your temporary password should not be shared with anyone.</p>
    </div>
    
    <div class="info-box">
      <strong>ℹ️ Next Steps:</strong>
      <p style="margin: 10px 0 0 0;">Your system administrator will assign you to one or more projects. You will receive a separate email notification when you are assigned to a project.</p>
    </div>
    
    <p>As a ${roleDisplay}, you will be able to:</p>
    <ul>
      ${role === 'admin' 
        ? `
      <li>Manage pledges for assigned projects</li>
      <li>View and generate reports</li>
      <li>Track pledge collection and follow-ups</li>
      <li>Access project dashboards and analytics</li>
        `
        : `
      <li>Follow up on pledges for assigned projects</li>
      <li>Update pledge statuses</li>
      <li>View follow-up reports</li>
      <li>Track your follow-up activities</li>
        `
      }
    </ul>
    
    <div style="text-align: center;">
      <a href="${loginUrl}" class="button">Login to Your Account</a>
    </div>
    
    <p>If you have any questions or need assistance, please contact your system administrator.</p>
  </div>
  
  <div class="footer">
    <p>This is an automated message from Pledge Tracker. Please do not reply to this email.</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generates plain text version of the account creation email
 * Used as fallback when HTML is not supported
 * 
 * @param params - Account creation email parameters
 * @returns Plain text string for the email body
 */
export function generateAccountCreationEmailPlainText(params: AccountCreationEmailParams): string {
  const { firstName, middleName, email, password, role, loginUrl } = params;
  
  const roleDisplay = role === 'admin' ? 'Administrator' : 'Follow-Up User';
  
  return `
Welcome to Pledge Tracker!

Hello ${firstName} ${middleName},

Your account has been created in the Pledge Tracker system as a ${roleDisplay}.

YOUR LOGIN CREDENTIALS
-----------------------
Email: ${email}
Temporary Password: ${password}

IMPORTANT SECURITY NOTICE
--------------------------
Please change your password immediately after your first login. Your temporary password should not be shared with anyone.

NEXT STEPS
----------
Your system administrator will assign you to one or more projects. You will receive a separate email notification when you are assigned to a project.

As a ${roleDisplay}, you will be able to:
${role === 'admin' 
  ? `
- Manage pledges for assigned projects
- View and generate reports
- Track pledge collection and follow-ups
- Access project dashboards and analytics
`
  : `
- Follow up on pledges for assigned projects
- Update pledge statuses
- View follow-up reports
- Track your follow-up activities
`
}

Login to your account: ${loginUrl}

If you have any questions or need assistance, please contact your system administrator.

---
This is an automated message from Pledge Tracker. Please do not reply to this email.
  `.trim();
}
