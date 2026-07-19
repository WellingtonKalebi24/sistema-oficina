import { SignJWT, jwtVerify } from "jose";

export type AccessTokenConfig = {
  audience: string;
  issuer: string;
  secret: string;
  ttlSeconds: number;
};

export type AccessTokenClaims = {
  sessionId: string;
  tenantId: string;
  userId: string;
};

export type VerifiedAccessToken = AccessTokenClaims & {
  expiresAt: Date;
};

export async function signAccessToken(
  config: AccessTokenConfig,
  claims: AccessTokenClaims,
): Promise<string> {
  return new SignJWT({
    sid: claims.sessionId,
    tenant_id: claims.tenantId,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(claims.userId)
    .setIssuer(config.issuer)
    .setAudience(config.audience)
    .setIssuedAt()
    .setExpirationTime(`${config.ttlSeconds}s`)
    .sign(toSecretKey(config.secret));
}

export async function verifyAccessToken(
  config: Omit<AccessTokenConfig, "ttlSeconds">,
  token: string,
): Promise<VerifiedAccessToken> {
  const { payload } = await jwtVerify(token, toSecretKey(config.secret), {
    audience: config.audience,
    issuer: config.issuer,
  });

  if (
    !payload.sub ||
    typeof payload.sid !== "string" ||
    typeof payload.tenant_id !== "string" ||
    typeof payload.exp !== "number"
  ) {
    throw new Error("Invalid access token claims.");
  }

  return {
    expiresAt: new Date(payload.exp * 1000),
    sessionId: payload.sid,
    tenantId: payload.tenant_id,
    userId: payload.sub,
  };
}

function toSecretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}
