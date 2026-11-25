import type { ComponentType } from "react";

export interface GameModuleProps {
  token: string;
}

/**
 * Registre des jeux internes (kind = "internal").
 * Pour ajouter un jeu interne : créer `src/games/mon-jeu.tsx` exportant un composant
 * `({ token }: GameModuleProps) => JSX`, puis l'enregistrer ici.
 */
export const gameModules: Record<string, ComponentType<GameModuleProps>> = {};
