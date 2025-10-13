import { isFriendshipAccepted } from '../repositories/friendships.js';

export function canViewProfile(currentUserId, targetUserId, friendship) {
  if (!currentUserId) {
    return false;
  }
  if (currentUserId === targetUserId) {
    return true;
  }
  return isFriendshipAccepted(friendship);
}

export function canPostOnWall(currentUserId, ownerId, friendship) {
  if (currentUserId === ownerId) {
    return true;
  }
  return isFriendshipAccepted(friendship);
}
