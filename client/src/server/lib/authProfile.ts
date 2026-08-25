interface UserLike {
  id: string;
  email: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

// Shared by /login, /login-pin, and /me — never send passwordHash/pinHash
// back to the client.
export function toProfile(user: UserLike) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
