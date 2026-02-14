import { describe, expect, test } from "vitest";
import { removeCommentById, updateCommentContent } from "./use-comments";

const makeComment = (id: string, replies: any[] = []) =>
  ({ id, content: `content-${id}`, replies }) as any;

describe("removeCommentById", () => {
  test("トップレベルのコメントをIDで削除する", () => {
    const comments = [makeComment("1"), makeComment("2")];
    const result = removeCommentById(comments, "1");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  test("ネストされた返信をIDで削除する", () => {
    const comments = [makeComment("1", [makeComment("1-1"), makeComment("1-2")])];
    const result = removeCommentById(comments, "1-1");
    expect(result[0].replies).toHaveLength(1);
    expect(result[0].replies[0].id).toBe("1-2");
  });

  test("深くネストされた返信をIDで削除する", () => {
    const comments = [makeComment("1", [makeComment("1-1", [makeComment("1-1-1")])])];
    const result = removeCommentById(comments, "1-1-1");
    expect(result[0].replies[0].replies).toHaveLength(0);
  });

  test("存在しないIDでは配列を変更しない", () => {
    const comments = [makeComment("1"), makeComment("2")];
    const result = removeCommentById(comments, "999");
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("1");
    expect(result[1].id).toBe("2");
  });

  test("唯一のコメントを削除すると空配列を返す", () => {
    const comments = [makeComment("1")];
    const result = removeCommentById(comments, "1");
    expect(result).toEqual([]);
  });

  test("元の配列を変更しない", () => {
    const comments = [makeComment("1"), makeComment("2")];
    removeCommentById(comments, "1");
    expect(comments).toHaveLength(2);
  });
});

describe("updateCommentContent", () => {
  test("トップレベルのコメント内容をIDで更新する", () => {
    const comments = [makeComment("1")];
    const result = updateCommentContent(comments, "1", "updated");
    expect(result[0].content).toBe("updated");
  });

  test("ネストされた返信の内容をIDで更新する", () => {
    const comments = [makeComment("1", [makeComment("1-1")])];
    const result = updateCommentContent(comments, "1-1", "updated");
    expect(result[0].replies[0].content).toBe("updated");
  });

  test("深くネストされた返信の内容をIDで更新する", () => {
    const comments = [makeComment("1", [makeComment("1-1", [makeComment("1-1-1")])])];
    const result = updateCommentContent(comments, "1-1-1", "updated");
    expect(result[0].replies[0].replies[0].content).toBe("updated");
  });

  test("対象外のコメントは変更しない", () => {
    const comments = [makeComment("1"), makeComment("2")];
    const result = updateCommentContent(comments, "1", "updated");
    expect(result[1].content).toBe("content-2");
  });

  test("存在しないIDでは配列を変更しない", () => {
    const comments = [makeComment("1")];
    const result = updateCommentContent(comments, "999", "updated");
    expect(result[0].content).toBe("content-1");
  });

  test("元の配列を変更しない", () => {
    const comments = [makeComment("1")];
    const original = comments[0].content;
    updateCommentContent(comments, "1", "updated");
    expect(comments[0].content).toBe(original);
  });
});
