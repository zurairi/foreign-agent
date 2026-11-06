/** Dispatch supplies authenticated identity; never trust a browser-supplied email. */
export function ownerCanWrite(email:string|null|undefined,configuredOwner:string|null|undefined):boolean {
  return !!email && !!configuredOwner && email.trim().toLowerCase()===configuredOwner.trim().toLowerCase();
}
