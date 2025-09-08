export const validateNickname = (
  nickname: string
): { valid: boolean; error?: string } => {
  if (nickname.length < 3) {
    return { valid: false, error: "Nickname must be at least 3 characters" };
  }

  if (nickname.length > 20) {
    return { valid: false, error: "Nickname must be less than 20 characters" };
  }

  // Check for maximum 2 digits
  const digitCount = (nickname.match(/\d/g) || []).length;
  if (digitCount > 2) {
    return { valid: false, error: "Maximum 2 digits allowed" };
  }

  // Check for repeated letters (max 3)
  const hasMoreThan3Repeats = /(.)\1{3,}/.test(nickname);
  if (hasMoreThan3Repeats) {
    return { valid: false, error: "Maximum 3 of the same letter in a row" };
  }

  // Check for consecutive spaces
  if (/\s{2,}/.test(nickname)) {
    return { valid: false, error: "No consecutive spaces allowed" };
  }

  // Check allowed characters (letters, numbers, space, hyphen, underscore)
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(nickname)) {
    return {
      valid: false,
      error: "Only letters, numbers, spaces, hyphens, and underscores allowed",
    };
  }

  // Check forbidden words
  const forbidden = ["allah", "admin"];
  const nickLower = nickname.toLowerCase();
  for (const word of forbidden) {
    if (nickLower.includes(word)) {
      return { valid: false, error: "This nickname is not allowed" };
    }
  }

  return { valid: true };
};
