// types.ts — domain shapes at the DS boundary.
//
// The legacy screens are still .jsx and untyped; these interfaces document the
// objects the backend layer hands them and are the seam we tighten over time.

export interface Profile {
  id: string;            // = auth.users.id (uuid)
  displayName: string;
  provider?: string;     // 'email' | 'discord' | 'google'
  avatar?: string | null;
  email?: string;        // only populated for the current user
}

export interface Campaign {
  id: string;            // uuid
  name: string;
  description: string;
  gmId: string;          // FK → Profile.id (the Director)
  inviteCode: string;    // "ABC-DEF"
  createdAt: number;
  memberIds: string[];   // includes gmId
}

// The character is a large nested blob; the screens own its inner shape. At the
// boundary we only rely on these top-level fields (the rest rides along in the
// jsonb `data` column unchanged).
export interface Character {
  id: string;            // client-supplied text id ('c…')
  ownerId: string | null;
  campaignId: string | null;
  status: 'in-progress' | 'complete';
  level: number;
  name?: string;
  identity?: { name?: string };
  portrait?: string;
  [key: string]: unknown;
}

export interface LoadedStore {
  profiles: Profile[];
  characters: Character[];
  campaigns: Campaign[];
}
