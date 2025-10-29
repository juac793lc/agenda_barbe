class UserService {
  /// Identificador del usuario actual. Debe asignarse al iniciar sesión.
  /// Si es `null`, no hay usuario autenticado.
  static String? currentUserId;

  /// Helper para establecer el usuario actual (ej. al iniciar sesión).
  static void setCurrentUserId(String? id) {
    currentUserId = id;
  }
}
