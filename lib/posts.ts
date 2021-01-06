import fs from "fs";
import path from "path";
import matter from "gray-matter";
import glob from "glob";

import markdownToHtml from "./markdown";
import { IS_PROD } from '../constants'
import { IPostProps } from "../pages/posts/[id]";
import { IWriteupProps } from "../pages/writeups/[...id]";

type ContentType = "posts" | "writeups";

export const getPostsIds = () => {
  const directory = path.join(process.cwd(), "posts");
  const filenames = fs.readdirSync(directory);
  return filenames.map((filename) => {
    const id = filename.replace(/\.md$/, "");
    return {
      params: {
        id,
      },
    };
  });
};

export const getWriteupsIds = () => {
  const directory = path.join(process.cwd(), "writeups");
  const filenames = glob.sync(path.join(directory, "**/*.md")) as string[];
  return filenames.map((filename) => {
    const id = filename.replace(directory, "").replace(/\.md$/, "").slice(1).split('/');
    return {
      params: {
        id,
      },
    };
  });
};

export const getSortedContent = (type: ContentType): IPostProps[] => {
  const directory = path.join(process.cwd(), type);

  if (type === "writeups") {
    const filenames = glob.sync(path.join(directory, "**/*.md")) as string[];
    const posts = filenames.map((filename) => {
      const id = filename.replace(directory, "").replace(/\.md$/, "").slice(1);

      // Read markdown file as string
      const fullPath = filename;
      const fileContents = fs.readFileSync(fullPath, "utf8");

      // Use gray-matter to parse the post metadata section
      const matterResult = matter(fileContents);

      // Combine the data with the id
      const { title, date, tags, draft } = matterResult.data;

      return {
        id,
        date,
        draft: !!draft,
        title: draft ? title + " (Draft)" : title,
        tags: tags || [],
      };
    });

    return posts.sort((a: IPostProps, b: IPostProps) => {
      if (a.date < b.date) {
        return 1;
      } else {
        return -1;
      }
    });
  } else {
    const filenames = fs.readdirSync(directory);
    const posts = filenames.map((filename) => {
      const id = filename.replace(/\.md$/, "");

      // Read markdown file as string
      const fullPath = path.join(directory, filename);
      const fileContents = fs.readFileSync(fullPath, "utf8");

      // Use gray-matter to parse the post metadata section
      const matterResult = matter(fileContents);

      // Combine the data with the id
      const { title, date, tags, draft } = matterResult.data;

      return {
        id,
        date,
        draft: !!draft,
        title: draft ? title + " (Draft)" : title,
        tags: tags || [],
      };
    }).filter(post => IS_PROD ? !post.draft : true);

    return posts.sort((a: IPostProps, b: IPostProps) => {
      if (a.date < b.date) {
        return 1;
      } else {
        return -1;
      }
    });
  }
};

const getContentData = async (id: string | string[], filename: string) => {
  const contentPath = path.join(process.cwd(), filename);
  const rawContent = fs.readFileSync(contentPath, "utf8");

  // Use gray-matter to parse the post metadata section
  const { content, data } = matter(rawContent);

  const { title, date, tags, draft } = data;

  // Use remark to convert markdown into HTML string
  const htmlContent = await markdownToHtml(content);

  // Combine the data with the id and contentHtml
  return {
    id,
    date,
    title,
    draft: !!draft,
    tags: tags || [],
    content,
    html: htmlContent,
  };
};

export const getWriteupData = async (id: string[]) => {
  const filename = `writeups/${id.join("/")}.md`;
  return getContentData(id, filename) as unknown as IWriteupProps;
};

export const getPostData = async (id: string) => {
  const filename = `posts/${id}.md`;
  return getContentData(id, filename) as unknown as IPostProps;
};
