export const templates = {
    verification: {
      subject: 'Verify your Vestige account',
      template: (data) => ({
        subject: 'Verify your Vestige account',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; color: #ffffff; padding: 2rem;">
            <h2 style="color: #3b82f6;">Welcome to Vestige</h2>
            <p>Your verification code is:</p>
            <div style="background: #2d2d2d; padding: 1rem; border-radius: 4px; text-align: center; margin: 1rem 0;">
              <h1 style="font-size: 32px; letter-spacing: 4px; color: #3b82f6; margin: 0;">${data.code}</h1>
            </div>
            <p style="color: #a3a3a3;">This code will expire in 15 minutes.</p>
            <p style="font-size: 12px; color: #666;">Verification attempt from: ${data.ipAddress}</p>
            <p style="font-size: 12px; color: #666;">Email tracking ID: #{trackingId}</p>
          </div>
        `
      }),
    },
  
    welcomeOnboard: {
      template: (username) => ({
        subject: 'Welcome to Vestige',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; color: #ffffff; padding: 2rem;">
            <h2 style="color: #3b82f6;">Welcome aboard, ${username}!</h2>
            <p>Your Vestige account is now verified and ready to use.</p>
            <div style="background: #2d2d2d; padding: 1rem; border-radius: 4px; margin: 1rem 0;">
              <p>Start exploring by:</p>
              <ul style="color: #a3a3a3;">
                <li>Completing your profile</li>
                <li>Following some creators</li>
                <li>Making your first post</li>
              </ul>
            </div>
            <p style="font-size: 12px; color: #666;">Email tracking ID: #{trackingId}</p>
          </div>
        `
      }),
    }
  };
