import { prisma } from "@must-iq/db";

/**
 * Resolves a list of Team IDs into their associated Workspace Identifiers.
 * Documents in the vector store are tagged with identifiers (e.g., "#frontend-dev"),
 * but the frontend sends Team IDs (CUIDs).
 */
export async function resolveSearchScopes(workspaces: string[]): Promise<string[]> {
    if (!workspaces || workspaces.length === 0) return ['general'];

    // Collect all unique identifiers associated with the provided team IDs
    const teams = await prisma.team.findMany({
        where: { id: { in: workspaces.filter(w => w !== 'general') } },
        select: { id: true, identifiers: true, workspaces: { select: { identifier: true } } }
    });

    const resolved = new Set<string>();
    
    // Always include 'general' and its associated identifier 'vault-v2'
    // to ensure global documents are retrieved correctly.
    if (workspaces.includes('general')) {
        resolved.add('general');
        resolved.add('vault-v2');
    }



    // Add all identifiers from the team (both historical array and relational workspaces)
    for (const team of teams) {
        if (team.identifiers) {
            team.identifiers.forEach(id => resolved.add(id));
        }
        if (team.workspaces) {
            team.workspaces.forEach(ws => resolved.add(ws.identifier));
        }
    }

    // If a workspace in the input list doesn't match a Team ID (e.g. it was an identifier already), 
    // keep it in the list. This supports legacy frontend requests or direct identifier searches.
    workspaces.forEach(w => {
        if (!w.startsWith('cmmu') && w !== 'general') {
            resolved.add(w);
        }
    });

    const finalScopes = Array.from(resolved);
    return finalScopes.length > 0 ? finalScopes : ['general'];
}
