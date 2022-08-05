/**
 * Adaptive Card data model. Properties can be referenced in an adaptive card via the `${var}`
 * Adaptive Card syntax.
 */
export interface SecretOpenCardData {
  Receiver: string;
}

export interface SecretCardData {
  title: string;
  body: string;
}

export interface WorkplaceCardData {
  subtitle: string;
  body: string;
}

export interface BirthCardData {
  title: string;
  bodyTop: string;
  bodyBottom: string;
}

export interface BirthOpenData {
  messageId: BigInteger;
  birthDate: string;
  username: string;
}
