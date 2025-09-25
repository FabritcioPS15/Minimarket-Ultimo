// src/hooks/useUsers.ts
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { User, UserFromDB, UserRole, mapUserFromDB } from "../types";

export function useUsers() {
  const DEBUG = false;
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Obtener todos los usuarios - CON DEBUGGING
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (DEBUG) console.log("Fetching users from Supabase...");
      
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        if (DEBUG) console.error("Supabase fetch error:", error);
        throw error;
      }
      
      if (DEBUG) console.log("📊 Raw users data from DB:", data);
      
      // Mapear usuarios de la BD al tipo frontend
      const mappedUsers = (data as UserFromDB[]).map(mapUserFromDB);
      if (DEBUG) console.log("🎯 Mapped users:", mappedUsers);
      
      setUsers(mappedUsers || []);
    } catch (err: any) {
      setError(err.message);
      if (DEBUG) console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar usuario por username - CON DEBUGGING MEJORADO
  const findUserByUsername = useCallback(async (username: string): Promise<User | null> => {
    try {
      if (DEBUG) console.log("🔍 Searching for username:", username);
      
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .limit(1);

      if (DEBUG) console.log("📋 Raw DB response for", username, ":", { data, error });
      
      if (error) {
        if (DEBUG) console.error("Supabase search error:", error);
        throw error;
      }
      
      if (data && data.length > 0) {
        if (DEBUG) console.log("User found in DB:", data[0]);
        const mappedUser = mapUserFromDB(data[0] as UserFromDB);
        if (DEBUG) console.log("Mapped user object:", mappedUser);
        return mappedUser;
      }

      if (DEBUG) console.log("No user found with username:", username);

      // Debug: ver todos los usuarios en la BD
      const { data: allUsers } = await supabase
        .from("users")
        .select("username, is_active")
        .limit(10);
      if (DEBUG) console.log("📋 All usernames in DB:", allUsers);
      
      return null;
    } catch (err: any) {
      if (DEBUG) console.error("Error finding user:", err);
      return null;
    }
  }, []);

  // Agregar usuario - CON DEBUGGING
  const addUser = async (userData: {
    username: string;
    email: string;
    role: UserRole;
    isActive: boolean;
    password: string;
  }) => {
    try {
      const userToInsert = {
        username: userData.username,
        email: userData.email,
        role: userData.role,
        is_active: userData.isActive,
        password: userData.password,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (DEBUG) console.log("Adding user to DB:", { ...userToInsert, password: '***' }); // No loggear password real
      
      const { data, error } = await supabase.from("users").insert([userToInsert]).select();
      
      if (error) {
        if (DEBUG) console.error("Error adding user:", error);
        throw error;
      }
      
      if (DEBUG) console.log("User added successfully:", data);
      await fetchUsers();
    } catch (err: any) {
      if (DEBUG) console.error("Error in addUser:", err.message);
      throw err;
    }
  };

  // Actualizar usuario - CORREGIDO
  const updateUser = async (user: User) => {
    try {
      // Preparar datos para actualizar (solo campos que pueden cambiar)
      const userToUpdate: any = {
        username: user.username,
        email: user.email,
        role: user.role,
        is_active: user.isActive,
        updated_at: new Date().toISOString(),
      };

      // Solo incluir password si se proporcionó uno nuevo y no está vacío
      if (user.password && user.password.trim() !== '') {
        userToUpdate.password = user.password;
      }

      if (DEBUG) console.log("Updating user:", { ...userToUpdate, password: userToUpdate.password ? '***' : 'unchanged' });
      
      const { error } = await supabase
        .from("users")
        .update(userToUpdate)
        .eq("id", user.id);

      if (error) {
        if (DEBUG) console.error("Error updating user:", error);
        throw error;
      }
      
      if (DEBUG) console.log("User updated successfully");
      await fetchUsers();
    } catch (err: any) {
      if (DEBUG) console.error("Error in updateUser:", err.message);
      throw err;
    }
  };

  // Eliminar usuario - CON MEJOR MANEJO DE ERRORES
  const deleteUser = async (id: string) => {
    try {
      if (DEBUG) console.log("Deleting user with ID:", id);
      
      const { error } = await supabase.from("users").delete().eq("id", id);
      
      if (error) {
        if (DEBUG) console.error("Error deleting user:", error);
        throw error;
      }
      
      if (DEBUG) console.log("✅ User deleted successfully");
      await fetchUsers();
    } catch (err: any) {
      if (DEBUG) console.error("Error in deleteUser:", err.message);
      throw err;
    }
  };

  // Verificar credenciales de login - CON DEBUGGING
  const verifyCredentials = async (username: string, password: string): Promise<User | null> => {
    try {
      if (DEBUG) console.log("🔐 Verifying credentials for:", username);
      const user = await findUserByUsername(username);
      
      if (DEBUG) console.log("📋 User found for verification:", user ? { ...user, password: '***' } : null);
      
      if (user) {
        if (DEBUG) console.log("🔑 Password check - DB exists:", !!user.password, "Input provided:", !!password);
        if (DEBUG) console.log("✅ Active status:", user.isActive);
        
        if (user.password === password && user.isActive) {
          if (DEBUG) console.log("🎉 Credentials verified successfully!");
          return user;
        }
      }
      
      if (DEBUG) console.log("❌ Credentials verification failed");
      return null;
    } catch (err: any) {
      if (DEBUG) console.error("❌ Error verifying credentials:", err);
      return null;
    }
  };

  // Función de debugging
  const debugUsers = async () => {
    try {
      if (DEBUG) console.log("🐛 DEBUG: Current users state:", users);
      
      const { data, error } = await supabase
        .from("users")
        .select("*");
      
      if (error) {
        if (DEBUG) console.error("🐛 DEBUG Error:", error);
        return;
      }
      
      if (DEBUG) console.log("🐛 DEBUG - All users in DB:", data);
      return data;
    } catch (err) {
      if (DEBUG) console.error("🐛 DEBUG Error:", err);
    }
  };

  // Función para verificar políticas RLS
  const checkRLSPolicies = async () => {
    try {
      if (DEBUG) console.log("🔍 Checking RLS policies...");
      
      // Probar operaciones básicas
      const { data: session } = await supabase.auth.getSession();
      if (DEBUG) console.log("🔐 Session:", session);
      
      // Probar SELECT
      const { error: selectError } = await supabase
        .from("users")
        .select("count")
        .limit(1);
      if (DEBUG) console.log("✅ SELECT policy:", selectError ? `Error: ${selectError.message}` : "Working");
      
      // Probar INSERT (usaremos un usuario temporal)
      const { error: insertError } = await supabase
        .from("users")
        .insert({ 
          username: 'test_rls', 
          email: 'test@rls.com', 
          role: 'cashier', 
          is_active: true,
          password: 'temp123'
        })
        .select();
      if (DEBUG) console.log("✅ INSERT policy:", insertError ? `Error: ${insertError.message}` : "Working");
      
    } catch (err) {
      if (DEBUG) console.error("❌ RLS check error:", err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    loading,
    error,
    refetch: fetchUsers,
    addUser,
    updateUser,
    deleteUser,
    findUserByUsername,
    verifyCredentials,
    debugUsers,
    checkRLSPolicies, // ← Nueva función para debug RLS
  };
}