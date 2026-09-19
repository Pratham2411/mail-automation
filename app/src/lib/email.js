import nodemailer from 'nodemailer';

let transporter = null;

export function createTransporter(config) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: config.email,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      refreshToken: config.refreshToken,
    },
  });
  return transporter;
}

export function getTransporter() { return transporter; }

export async function testConnection(config) {
  try {
    const t = createTransporter(config);
    await t.verify();
    return { success: true, message: 'Gmail OAuth2 connection successful!' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function sendEmail({ to, subject, body, from, replyTo }) {
  const t = getTransporter();
  if (!t) throw new Error('Email transporter not configured. Set up Gmail OAuth2 in Settings.');

  const mailOptions = {
    from: from || process.env.GMAIL_USER,
    to,
    subject,
    html: body.replace(/\n/g, '<br>'),
    text: body,
  };
  if (replyTo) mailOptions.replyTo = replyTo;

  const result = await t.sendMail(mailOptions);
  return { success: true, messageId: result.messageId, response: result.response };
}

export function validateEmail(email) {
  if (!email) return { valid: false, reason: 'Empty email' };
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) return { valid: false, reason: 'Invalid format' };
  const domain = email.split('@')[1].toLowerCase();
  const invalidDomains = ['example.com', 'test.com', 'localhost', 'invalid.com'];
  if (invalidDomains.includes(domain)) return { valid: false, reason: 'Test/invalid domain' };
  return { valid: true };
}

export function personalizeTemplate(template, variables) {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    result = result.replace(regex, value || '');
  }
  result = result.replace(/\{\{\s*\w+\s*\}\}/g, '[Not Set]');
  return result;
}

export function generateEmailForContact(contact, template, userProfile, companyProfile = null) {
  const variables = {
    recruiter_name: contact.name && !contact.name.includes('Team') ? contact.name.split(' ')[0] : 'Hiring Team',
    company: contact.company || '[Company]',
    role: contact.recruiting_area || contact.category || 'Software Engineering',
    category: contact.category || contact.recruiting_area || 'technology',
    my_name: userProfile.my_name || '[Your Name]',
    university: userProfile.university || '[University]',
    skills: userProfile.skills || '[Skills]',
    project: userProfile.project || '[Project]',
    resume_link: userProfile.resume_link || '[Resume URL]',
    github_link: userProfile.github_link || '[GitHub URL]',
    linkedin_link: userProfile.linkedin_link || '[LinkedIn URL]',
  };

  if (companyProfile) {
    if (companyProfile.tech_stack) variables.skills = matchSkills(userProfile.skills, companyProfile.tech_stack);
    if (companyProfile.open_roles) variables.role = companyProfile.open_roles;
  }

  const subject = personalizeTemplate(template.subject, variables);
  const body = personalizeTemplate(template.body, variables);
  return { subject, body, variables };
}

function matchSkills(userSkills, companyStack) {
  if (!userSkills || !companyStack) return userSkills;
  const userList = userSkills.split(',').map(s => s.trim().toLowerCase());
  const companyList = companyStack.split(',').map(s => s.trim().toLowerCase());
  const matched = userList.filter(skill => companyList.some(tech => tech.includes(skill) || skill.includes(tech)));
  return matched.length > 0 ? matched.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ') : userSkills;
}
