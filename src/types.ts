export interface Chapter {
  filename: string;
  uri: string;
}

export interface Audiobook {
  title: string;
  folderUri: string;
  chapters: Chapter[];
}
