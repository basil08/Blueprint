// Verify token using Firebase REST API
export async function verifyToken(token: string): Promise<{ uid: string; email: string | null; displayName: string | null } | null> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) {
      return null;
    }

    const response = await fetch(
      `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken: token }),
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.users && data.users.length > 0) {
      const user = data.users[0];
      return {
        uid: user.localId,
        email: user.email || null,
        displayName: user.displayName || null,
      };
    }

    return null;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export function getAuthToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

