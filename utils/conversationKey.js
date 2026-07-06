// Always sort so [A, B] and [B, A] resolve to the same conversation doc
function getParticipants(clerkIdA, clerkIdB) {
  return [clerkIdA, clerkIdB].sort();
}

module.exports = { getParticipants };