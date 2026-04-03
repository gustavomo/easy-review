import { DirectoryNode, EasyReviewTreeNode, FileNode, PRFileChange } from '../providers/EasyReviewTreeNodes';
import type { StoredPR } from '../storage/types';

/**
 * Builds a 3-level directory tree from a flat file list.
 *
 * Algorithm:
 * 1. Build a mutable tree from a virtual root DirectoryNode('')
 * 2. Walk path segments for each file, creating DirectoryNode children as needed
 * 3. Compact single-child directory nodes (merge labels with '/')
 * 4. Sort each level: DirectoryNode before FileNode, alphabetically within each group
 * 5. If root label is '', return root.children (flatten root)
 */
export function buildDirectoryTree(
  files: PRFileChange[],
  pr: StoredPR,
): EasyReviewTreeNode[] {
  if (files.length === 0) {
    return [];
  }

  // Step 1: Build tree from virtual root
  const root = new DirectoryNode('');

  for (const file of files) {
    const segments = file.filename.split('/');
    let current = root;

    // Walk directory segments (all except last)
    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i];
      let child = current.children.find(
        (n): n is DirectoryNode => n instanceof DirectoryNode && n.label === seg,
      );
      if (!child) {
        child = new DirectoryNode(seg);
        current.children.push(child);
      }
      current = child;
    }

    // Leaf: create FileNode
    current.children.push(new FileNode(file, pr));
  }

  // Step 2: Compact single-child directories recursively
  compactNode(root);

  // Step 3: Sort children (dirs before files, alphabetical within group)
  sortChildren(root);

  // Step 4: Return root's children (root label is '')
  return root.children;
}

/**
 * Compact single-child DirectoryNode: if a DirectoryNode has exactly one child
 * that is also a DirectoryNode, merge labels with '/' and adopt grandchildren.
 * Repeat until no more single-child directory-only nodes exist.
 */
function compactNode(node: DirectoryNode): void {
  // First, recursively compact all children
  for (const child of node.children) {
    if (child instanceof DirectoryNode) {
      compactNode(child);
    }
  }

  // Then compact this node's children in-place
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (child instanceof DirectoryNode) {
      // Compact the child while it has exactly one child that is a DirectoryNode
      while (
        child.children.length === 1 &&
        child.children[0] instanceof DirectoryNode
      ) {
        const grandchild = child.children[0] as DirectoryNode;
        child.label = `${child.label}/${grandchild.label}`;
        child.children = grandchild.children;
      }
    }
  }
}

/**
 * Sort children of a DirectoryNode: DirectoryNode before FileNode,
 * alphabetically within each group. Recurse into subdirectories.
 */
function sortChildren(node: DirectoryNode): void {
  const dirs = node.children.filter((n): n is DirectoryNode => n instanceof DirectoryNode);
  const files = node.children.filter((n): n is FileNode => n instanceof FileNode);

  dirs.sort((a, b) => String(a.label).localeCompare(String(b.label)));
  files.sort((a, b) => a.file.filename.localeCompare(b.file.filename));

  node.children = [...dirs, ...files];

  // Recurse
  for (const dir of dirs) {
    sortChildren(dir);
  }
}
