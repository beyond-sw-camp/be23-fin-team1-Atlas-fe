export const PROFILE_IMAGE_UPDATED_EVENT = 'atlas:profile-image-updated'

export function notifyProfileImageUpdated() {
  window.dispatchEvent(new CustomEvent(PROFILE_IMAGE_UPDATED_EVENT))
}
