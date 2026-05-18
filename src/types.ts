export interface Chapter {
  filename: string;
  uri: string;
}

export interface Audiobook {
  title: string;
  author?: string;
  folderUri: string;
  chapters: Chapter[];
}
