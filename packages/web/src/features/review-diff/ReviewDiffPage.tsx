import { useMemo, useState } from "react";
import type { ReviewFileDiff } from "@diffdeck/core";
import type { ReviewDiffContext } from "./review-diff-context.js";
import "./ReviewDiffPage.scss";

type DiffDisplayMode = "split" | "unified";

type DiffCell = {
  line?: number;
  side?: "old" | "new";
  text: string;
};

type DiffRow =
  | {
      key: string;
      kind: "context";
      old: DiffCell;
      new: DiffCell;
    }
  | {
      key: string;
      kind: "change" | "delete" | "add";
      old?: DiffCell;
      new?: DiffCell;
    }
  | {
      key: string;
      kind: "meta";
      text: string;
    };

type ReviewDiffPageProps = {
  fileDiffs: ReviewFileDiff[];
  onContextChange: (context: ReviewDiffContext) => void;
  selectedContext: ReviewDiffContext;
};

function parseHunkHeader(line: string): { oldLine: number; newLine: number } | undefined {
  const match = /^@@ -(?<oldLine>\d+)(?:,\d+)? \+(?<newLine>\d+)(?:,\d+)? @@/.exec(line);

  if (!match?.groups) {
    return undefined;
  }

  return {
    oldLine: Number(match.groups.oldLine),
    newLine: Number(match.groups.newLine),
  };
}

function parseUnifiedDiff(unifiedDiff: string): DiffRow[] {
  const rows: DiffRow[] = [];
  const pendingDeletes: DiffCell[] = [];
  const pendingAdds: DiffCell[] = [];
  let oldLine = 0;
  let newLine = 0;
  let rowIndex = 0;
  let hasHunk = false;

  const flushChanges = () => {
    const count = Math.max(pendingDeletes.length, pendingAdds.length);

    for (let index = 0; index < count; index += 1) {
      const oldCell = pendingDeletes[index];
      const newCell = pendingAdds[index];
      rows.push({
        key: `change-${rowIndex}`,
        kind: oldCell && newCell ? "change" : oldCell ? "delete" : "add",
        old: oldCell,
        new: newCell,
      });
      rowIndex += 1;
    }

    pendingDeletes.length = 0;
    pendingAdds.length = 0;
  };

  unifiedDiff.replace(/\r?\n$/, "").split(/\r?\n/).forEach((line) => {
    if (line.startsWith("@@")) {
      flushChanges();
      hasHunk = true;
      const hunk = parseHunkHeader(line);
      if (hunk) {
        oldLine = hunk.oldLine;
        newLine = hunk.newLine;
      }
      rows.push({ key: `meta-${rowIndex}`, kind: "meta", text: line });
      rowIndex += 1;
      return;
    }

    if (line.startsWith("---") || line.startsWith("+++") || line.startsWith("diff --git") || line.startsWith("index ")) {
      flushChanges();
      rows.push({ key: `meta-${rowIndex}`, kind: "meta", text: line });
      rowIndex += 1;
      return;
    }

    if (!hasHunk || line.startsWith("\\ ")) {
      flushChanges();
      rows.push({ key: `meta-${rowIndex}`, kind: "meta", text: line });
      rowIndex += 1;
      return;
    }

    if (line.startsWith("-")) {
      pendingDeletes.push({ line: oldLine, side: "old", text: line.slice(1) });
      oldLine += 1;
      return;
    }

    if (line.startsWith("+")) {
      pendingAdds.push({ line: newLine, side: "new", text: line.slice(1) });
      newLine += 1;
      return;
    }

    flushChanges();
    const text = line.startsWith(" ") ? line.slice(1) : line;
    rows.push({
      key: `context-${rowIndex}`,
      kind: "context",
      old: { line: oldLine, side: "old", text },
      new: { line: newLine, side: "new", text },
    });
    oldLine += 1;
    newLine += 1;
    rowIndex += 1;
  });

  flushChanges();
  return rows;
}

function countFilesLabel(count: number): string {
  return `${count} ${count > 1 ? "files" : "file"}`;
}

function matchesFileSearch(fileDiff: ReviewFileDiff, searchTerm: string): boolean {
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase();

  if (!normalizedSearch) {
    return true;
  }

  return [fileDiff.filePath, fileDiff.oldFilePath]
    .filter((path): path is string => Boolean(path))
    .some((path) => path.toLocaleLowerCase().includes(normalizedSearch));
}

function isSelectedFile(selectedContext: ReviewDiffContext, filePath: string): boolean {
  return selectedContext.filePaths.includes(filePath);
}

function formatStatus(status: ReviewFileDiff["status"]): string {
  return status.replace("_", " ");
}

function DiffLineButton({
  cell,
  filePath,
  isSelected,
  onSelect,
}: {
  cell?: DiffCell;
  filePath: string;
  isSelected: boolean;
  onSelect: (filePath: string, cell: DiffCell) => void;
}) {
  if (!cell?.line || !cell.side) {
    return <span className="review-diff-page__line-number" />;
  }

  return (
    <button
      aria-label={`Select ${filePath} ${cell.side} line ${cell.line}`}
      className={`review-diff-page__line-number ${isSelected ? "review-diff-page__line-number--selected" : ""}`}
      onClick={() => onSelect(filePath, cell)}
      type="button"
    >
      {cell.line}
    </button>
  );
}

export function ReviewDiffPage({ fileDiffs, onContextChange, selectedContext }: ReviewDiffPageProps) {
  const [displayMode, setDisplayMode] = useState<DiffDisplayMode>("split");
  const [fileSearch, setFileSearch] = useState("");
  const [activeFilePath, setActiveFilePath] = useState(fileDiffs[0]?.filePath);
  const filteredFileDiffs = useMemo(
    () => fileDiffs.filter((fileDiff) => matchesFileSearch(fileDiff, fileSearch)),
    [fileDiffs, fileSearch],
  );
  const activeFile = filteredFileDiffs.find((fileDiff) => fileDiff.filePath === activeFilePath) ?? filteredFileDiffs[0];
  const activeFileIndex = activeFile ? filteredFileDiffs.findIndex((fileDiff) => fileDiff.id === activeFile.id) : -1;
  const canGoToPreviousFile = activeFileIndex > 0;
  const canGoToNextFile = activeFileIndex >= 0 && activeFileIndex < filteredFileDiffs.length - 1;
  const rows = useMemo(() => parseUnifiedDiff(activeFile?.unifiedDiff ?? ""), [activeFile?.unifiedDiff]);
  const selectedLine = selectedContext.line;
  const hasFileSearch = Boolean(fileSearch.trim());

  const toggleFileContext = (filePath: string) => {
    const nextFilePaths = isSelectedFile(selectedContext, filePath)
      ? selectedContext.filePaths.filter((selectedPath) => selectedPath !== filePath)
      : [...selectedContext.filePaths, filePath];

    onContextChange({
      filePaths: nextFilePaths,
    });
  };

  const selectLine = (filePath: string, cell: DiffCell) => {
    if (!cell.line || !cell.side) {
      return;
    }

    onContextChange({
      filePaths: [filePath],
      line: {
        filePath,
        line: cell.line,
        side: cell.side,
      },
    });
  };

  const selectActiveFile = () => {
    if (!activeFile) {
      return;
    }

    onContextChange({
      filePaths: [activeFile.filePath],
    });
  };

  const goToFile = (offset: -1 | 1) => {
    const nextFile = filteredFileDiffs[activeFileIndex + offset];

    if (!nextFile) {
      return;
    }

    setActiveFilePath(nextFile.filePath);
  };

  if (!fileDiffs.length) {
    return (
      <div className="review-diff-page review-diff-page--empty">
        <div className="review-diff-page__empty">
          <h2 className="review-diff-page__empty-title">No processed file diffs</h2>
          <p className="review-diff-page__empty-text">File changes will appear here when they are attached to the review.</p>
        </div>
      </div>
    );
  }

  return (
    <section className="review-diff-page" aria-label="Processed file diffs">
      <aside className="review-diff-page__files" aria-label="Files">
        <div className="review-diff-page__files-header">
          <span>
            {hasFileSearch ? `${filteredFileDiffs.length}/${fileDiffs.length} files` : countFilesLabel(fileDiffs.length)}
          </span>
          <span>{countFilesLabel(selectedContext.filePaths.length)} in context</span>
        </div>

        <label className="review-diff-page__file-search">
          <span className="review-diff-page__file-search-label">Search files</span>
          <input
            className="review-diff-page__file-search-input"
            onChange={(event) => setFileSearch(event.target.value)}
            placeholder="Filename or path"
            type="search"
            value={fileSearch}
          />
        </label>

        <div className="review-diff-page__file-list">
          {filteredFileDiffs.length ? (
            filteredFileDiffs.map((fileDiff) => {
              const isActive = activeFile?.filePath === fileDiff.filePath;
              const isInContext = isSelectedFile(selectedContext, fileDiff.filePath);

              return (
                <article
                  className={`review-diff-page__file-item ${isActive ? "review-diff-page__file-item--active" : ""}`}
                  key={fileDiff.id}
                >
                  <button
                    className="review-diff-page__file-open"
                    onClick={() => setActiveFilePath(fileDiff.filePath)}
                    type="button"
                  >
                    <span className="review-diff-page__file-path">{fileDiff.filePath}</span>
                    <span className="review-diff-page__file-meta">
                      {formatStatus(fileDiff.status)}
                      {typeof fileDiff.additions === "number" ? ` +${fileDiff.additions}` : ""}
                      {typeof fileDiff.deletions === "number" ? ` -${fileDiff.deletions}` : ""}
                    </span>
                  </button>
                  <label className="review-diff-page__context-toggle">
                    <input checked={isInContext} onChange={() => toggleFileContext(fileDiff.filePath)} type="checkbox" />
                    Context
                  </label>
                </article>
              );
            })
          ) : (
            <div className="review-diff-page__file-list-empty">
              No file matches <span>{fileSearch.trim()}</span>
            </div>
          )}
        </div>
      </aside>

      <div className="review-diff-page__viewer">
        <header className="review-diff-page__toolbar">
          <div className="review-diff-page__current-file">
            <p className="review-diff-page__kicker">Diff</p>
            <h2 className="review-diff-page__file-title">{activeFile?.filePath}</h2>
            {activeFile?.oldFilePath ? <p className="review-diff-page__rename">{activeFile.oldFilePath}</p> : null}
          </div>

          <div className="review-diff-page__tools">
            <div className="review-diff-page__file-nav" aria-label="File navigation">
              <button
                aria-label="Previous file"
                className="review-diff-page__nav-button"
                disabled={!canGoToPreviousFile}
                onClick={() => goToFile(-1)}
                type="button"
              >
                {"<"}
              </button>
              <span className="review-diff-page__file-position">
                {activeFile ? activeFileIndex + 1 : 0}/{filteredFileDiffs.length}
              </span>
              <button
                aria-label="Next file"
                className="review-diff-page__nav-button"
                disabled={!canGoToNextFile}
                onClick={() => goToFile(1)}
                type="button"
              >
                {">"}
              </button>
            </div>
            <div className="review-diff-page__mode" aria-label="Diff display mode">
              <button
                aria-pressed={displayMode === "split"}
                className={`review-diff-page__mode-button ${
                  displayMode === "split" ? "review-diff-page__mode-button--active" : ""
                }`}
                onClick={() => setDisplayMode("split")}
                type="button"
              >
                Side by side
              </button>
              <button
                aria-pressed={displayMode === "unified"}
                className={`review-diff-page__mode-button ${
                  displayMode === "unified" ? "review-diff-page__mode-button--active" : ""
                }`}
                onClick={() => setDisplayMode("unified")}
                type="button"
              >
                Stacked
              </button>
            </div>
            <button className="review-diff-page__context-button" onClick={selectActiveFile} type="button">
              Use file as context
            </button>
          </div>
        </header>

        {!activeFile ? (
          <div className="review-diff-page__no-match">
            <h3 className="review-diff-page__no-match-title">No matching file</h3>
            <p className="review-diff-page__no-match-text">Adjust the file search to bring diffs back into view.</p>
          </div>
        ) : displayMode === "split" ? (
          <div className="review-diff-page__split" role="table" aria-label={`Side by side diff for ${activeFile?.filePath}`}>
            {rows.map((row) => {
              if (row.kind === "meta") {
                return (
                  <div className="review-diff-page__split-meta" key={row.key} role="row">
                    {row.text}
                  </div>
                );
              }

              const oldSelected =
                selectedLine?.filePath === activeFile?.filePath &&
                selectedLine.side === "old" &&
                selectedLine.line === row.old?.line;
              const newSelected =
                selectedLine?.filePath === activeFile?.filePath &&
                selectedLine.side === "new" &&
                selectedLine.line === row.new?.line;

              return (
                <div className={`review-diff-page__split-row review-diff-page__split-row--${row.kind}`} key={row.key} role="row">
                  <DiffLineButton cell={row.old} filePath={activeFile?.filePath ?? ""} isSelected={oldSelected} onSelect={selectLine} />
                  <code className="review-diff-page__code-cell">{row.old?.text ?? ""}</code>
                  <DiffLineButton cell={row.new} filePath={activeFile?.filePath ?? ""} isSelected={newSelected} onSelect={selectLine} />
                  <code className="review-diff-page__code-cell">{row.new?.text ?? ""}</code>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="review-diff-page__unified" role="table" aria-label={`Stacked diff for ${activeFile?.filePath}`}>
            {rows.map((row) => {
              if (row.kind === "meta") {
                return (
                  <div className="review-diff-page__unified-meta" key={row.key} role="row">
                    {row.text}
                  </div>
                );
              }

              const lineCells =
                row.kind === "context"
                  ? [{ cell: row.new, kind: "context", prefix: " " }]
                  : [
                      row.old ? { cell: row.old, kind: "delete", prefix: "-" } : undefined,
                      row.new ? { cell: row.new, kind: "add", prefix: "+" } : undefined,
                    ].filter((cell): cell is { cell: DiffCell; kind: string; prefix: string } => Boolean(cell));

              return lineCells.map(({ cell, kind, prefix }) => {
                const isSelected =
                  selectedLine?.filePath === activeFile?.filePath &&
                  selectedLine.side === cell.side &&
                  selectedLine.line === cell.line;

                return (
                  <div className={`review-diff-page__unified-row review-diff-page__unified-row--${kind}`} key={`${row.key}-${cell.side}`}>
                    <DiffLineButton cell={cell} filePath={activeFile?.filePath ?? ""} isSelected={isSelected} onSelect={selectLine} />
                    <span className="review-diff-page__prefix">{prefix}</span>
                    <code className="review-diff-page__code-cell">{cell.text}</code>
                  </div>
                );
              });
            })}
          </div>
        )}
      </div>
    </section>
  );
}
