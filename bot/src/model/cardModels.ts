/**
 * Adaptive Card data model. Properties can be referenced in an adaptive card via the `${var}`
 * Adaptive Card syntax.
 */
export interface SecretSendCardData {
  Icon1: string;
  Icon2: string;
  Icon3: string;
  IconName1: string;
  IconName2: string;
  IconName3: string;
  backgroundImage: string;
  backgroundImage01: string;
  backgroundImage02: string;
  backgroundImage03: string;
  senderNick: string;
  receiver: string;
  contents: string;
}

export interface SecretOpenCardData {
  Receiver: string;
}

export interface SecretCardData {
  background: string;
  title: string;
  body: string;
}

export interface WorkplaceCardData {
  title: string;
  subtitle: string;
  body: string;
  button: string;
}

export interface WorkplaceFinishCardData {
  title: string;
  subtitle: string;
  body: string;
}

export interface BirthCardData {
  background: string;
  title: string;
  bodyTop: string;
  bodyBottom: string;
}

export interface BirthOpenData {
  messageId: BigInteger;
  birthDate: string;
  username: string;
}
