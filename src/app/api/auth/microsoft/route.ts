import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.AZURE_AD_CLIENT_ID;
  const tenantId = process.env.AZURE_AD_TENANT_ID || 'common';
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/callback/microsoft`;

  if (!clientId) {
    return NextResponse.json({ error: 'AZURE_AD_CLIENT_ID is not configured in .env' }, { status: 500 });
  }

  // Microsoft Entra ID (Azure AD) v2.0 endpoint
  const authUrl = new URL(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`);
  
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('response_mode', 'query');
  authUrl.searchParams.append('scope', 'openid profile email User.Read');
  
  // Optionally add state for CSRF protection in production
  const state = Math.random().toString(36).substring(7);
  authUrl.searchParams.append('state', state);

  return NextResponse.redirect(authUrl.toString());
}
