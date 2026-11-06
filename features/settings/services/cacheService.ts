import { CACHE_ROOT_PROPOSALS, type CacheRootProposal } from "./cacheRegistry";

export interface CacheFileMetadata {
  readonly owner: string;
  readonly relativePath: string;
  readonly canonicalPath: string;
  readonly kind: "file" | "directory";
  readonly symbolicLink: boolean;
  readonly inUse: boolean;
  readonly bytes: number | null;
}
/** Read-only seam for metadata fixtures. No deletion, storage write, or invalidation capability. */
export interface CacheInventoryReader {
  inspect(root: CacheRootProposal): Promise<readonly CacheFileMetadata[]>;
}
export interface CacheInventory {
  readonly approval: "pending";
  readonly deletionEnabled: false;
  readonly items: number;
  readonly bytes: number | null;
  readonly excludedItems: number;
  readonly failedRoots: number;
  readonly status: "ready" | "partial";
  readonly libraryCacheBytes: null;
}

function safeSegments(path: string) {
  return path.length > 0 && path.split("/").every(segment =>
    /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(segment) && !segment.endsWith("."));
}
function safeRoot(root: CacheRootProposal) {
  // Reserve a dedicated app-owned subtree; never accept cacheDirectory/documentDirectory wholesale.
  return !!root.owner.trim() && !!root.regenerateProof.trim() &&
    /^file:\/\/\/[A-Za-z0-9/_-]*\/(?:cache|Caches)\/app-owned-cache\/[A-Za-z0-9_-]+$/.test(root.canonicalRoot);
}
function ownedFile(file: CacheFileMetadata, root: CacheRootProposal) {
  return file.owner === root.owner && file.kind === "file" && file.symbolicLink === false &&
    !file.inUse && safeSegments(file.relativePath) &&
    file.canonicalPath === `${root.canonicalRoot}/${file.relativePath}` &&
    (file.bytes === null || (Number.isSafeInteger(file.bytes) && file.bytes >= 0));
}

/** Inventory/proposal only. Even injected fixture proposals cannot enable real deletion. */
export function createCacheInventoryService(reader: CacheInventoryReader, proposals: readonly CacheRootProposal[] = CACHE_ROOT_PROPOSALS) {
  const roots = proposals.map(root => Object.freeze({ ...root }));
  let pending: Promise<CacheInventory> | undefined;
  const read = async (): Promise<CacheInventory> => {
    let items = 0, bytes = 0, unknownSize = false, excludedItems = 0, failedRoots = 0;
    const seen = new Set<string>();
    for (const root of roots) {
      if (!safeRoot(root)) { failedRoots++; continue; }
      try {
        const files = await reader.inspect(root);
        for (const file of files) {
          if (!ownedFile(file, root) || seen.has(file.canonicalPath)) { excludedItems++; continue; }
          seen.add(file.canonicalPath);
          items++;
          if (file.bytes === null) unknownSize = true;
          else if (Number.isSafeInteger(bytes + file.bytes)) bytes += file.bytes;
          else unknownSize = true;
        }
      } catch { failedRoots++; }
    }
    return Object.freeze({ approval: "pending", deletionEnabled: false, items,
      bytes: unknownSize || failedRoots ? null : bytes, excludedItems, failedRoots,
      status: failedRoots ? "partial" : "ready", libraryCacheBytes: null });
  };
  return Object.freeze({
    inventory(): Promise<CacheInventory> {
      if (!pending) pending = read().finally(() => { pending = undefined; });
      return pending;
    },
  });
}

// No native adapter or fake disposable files: with an empty registry there is nothing to inspect.
export const cacheInventoryService = createCacheInventoryService({ inspect: async () => [] });
