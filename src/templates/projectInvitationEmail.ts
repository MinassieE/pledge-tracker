/**
 * Email template for existing user project invitation
 * Sent when an existing user is assigned to a new project
 * 
 * Requirements: 3.7, 3.8, 8.4, 8.5, 8.6
 */

export interface ProjectInvitationEmailParams {
  firstName: string;
  middleName: string;
  projectName: string;
  role: 'admin' | 'followUp';
  loginUrl: string;
}

/**
 * Generates HTML email content for project invitation
 * 
 * @param params - Project invitation email parameters
 * @returns HTML string for the email body
 */
export function generateProjectInvitationEmail(params: ProjectInvitationEmailParams): string {
  const { firstName, middleName, projectName, role, loginUrl } = params;
  
  const roleDisplay = role === 'admin' ? 'Administrator' : 'Follow-Up User';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Project Assignment</title>
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
      background-color: #2196F3;
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
    .project-box {
      background-color: #fff;
      border: 2px solid #2196F3;
      border-radius: 5px;
      padding: 20px;
      margin: 20px 0;
      text-align: center;
    }
    .project-name {
      font-size: 24px;
      font-weight: bold;
      color: #2196F3;
      margin: 10px 0;
    }
    .role-badge {
      display: inline-block;
      background-color: #2196F3;
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: bold;
      margin: 10px 0;
    }
    .info-box {
      background-color: #e3f2fd;
      border-left: 4px solid #2196F3;
      padding: 15px;
      margin: 20px 0;
    }
    .button {
      display: inline-block;
      background-color: #2196F3;
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
    <h1>New Project Assignment</h1>
  </div>
  
  <div class="content">
    <p>Hello ${firstName} ${middleName},</p>
    
    <p>You have been assigned to a new project in the Pledge Tracker system.</p>
    
    <div class="project-box">
      <div style="color: #666; font-size: 14px;">PROJECT</div>
      <div class="project-name">${projectName}</div>
      <div class="role-badge">${roleDisplay}</div>
    </div>
    
    <div class="info-box">
      <strong>ℹ️ Your Role:</strong>
      <p style="margin: 10px 0 0 0;">You have been assigned as a <strong>${roleDisplay}</strong> for this project.</p>
    </div>
    
    <p>As a ${roleDisplay} for ${projectName}, you will be able to:</p>
    <ul>
      ${role === 'admin' 
        ? `
      <li>Manage pledges for this project</li>
      <li>View and generate project-specific reports</li>
      <li>Track pledge collection and follow-ups</li>
      <li>Access project dashboards and analytics</li>
      <li>Monitor project financial metrics</li>
        `
        : `
      <li>Follow up on pledges for this project</li>
      <li>Update pledge statuses and notes</li>
      <li>View follow-up reports for this project</li>
      <li>Track your follow-up activities</li>
      <li>Record pledge payment information</li>
        `
      }
    </ul>
    
    <p>You can access the project using your existing login credentials. Simply log in and select <strong>${projectName}</strong> from the project selector.</p>
    
    <div style="text-align: center;">
      <a href="${loginUrl}" class="button">Access Pledge Tracker</a>
    </div>
    
    <p>If you have any questions about your new assignment or need assistance, please contact your system administrator.</p>
  </div>
  
  <div class="footer">
    <p>This is an automated message from Pledge Tracker. Please do not reply to this email.</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generates plain text version of the project invitation email
 * Used as fallback when HTML is not supported
 * 
 * @param params - Project invitation email parameters
 * @returns Plain text string for the email body
 */
export function generateProjectInvitationEmailPlainText(params: ProjectInvitationEmailParams): string {
  const { firstName, middleName, projectName, role, loginUrl } = params;
  
  const roleDisplay = role === 'admin' ? 'Administrator' : 'Follow-Up User';
  
  return `
New Project Assignment

Hello ${firstName} ${middleName},

You have been assigned to a new project in the Pledge Tracker system.

PROJECT: ${projectName}
ROLE: ${roleDisplay}

YOUR ROLE
---------
You have been assigned as a ${roleDisplay} for this project.

As a ${roleDisplay} for ${projectName}, you will be able to:
${role === 'admin' 
  ? `
- Manage pledges for this project
- View and generate project-specific reports
- Track pledge collection and follow-ups
- Access project dashboards and analytics
- Monitor project financial metrics
`
  : `
- Follow up on pledges for this project
- Update pledge statuses and notes
- View follow-up reports for this project
- Track your follow-up activities
- Record pledge payment information
`
}

You can access the project using your existing login credentials. Simply log in and select "${projectName}" from the project selector.

Access Pledge Tracker: ${loginUrl}

If you have any questions about your new assignment or need assistance, please contact your system administrator.

---
This is an automated message from Pledge Tracker. Please do not reply to this email.
  `.trim();
}
