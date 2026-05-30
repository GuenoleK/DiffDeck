export type ReviewDiffLineContext = {
  filePath: string;
  line: number;
  side: "old" | "new";
};

export type ReviewDiffContext = {
  filePaths: string[];
  line?: ReviewDiffLineContext;
};
