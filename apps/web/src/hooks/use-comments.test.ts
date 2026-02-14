import { describe, expect, test } from "vitest";
import { removeCommentById, updateCommentContent } from "./use-comments";

const makeComment = (id: string, replies: any[] = []) =>
  ({ id, content: `content-${id}`, replies }) as any;

describe("removeCommentById", () => {
  test("removes a top-level comment by id", () => {
    const comments = [makeComment("1"), makeComment("2")];
    const result = removeCommentById(comments, "1");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  test("removes a nested reply by id", () => {
    const comments = [makeComment("1", [makeComment("1-1"), makeComment("1-2")])];
    const result = removeCommentById(comments, "1-1");
    expect(result[0].replies).toHaveLength(1);
    expect(result[0].replies[0].id).toBe("1-2");
  });

  test("removes a deeply nested reply by id", () => {
    const comments = [makeComment("1", [makeComment("1-1", [makeComment("1-1-1")])])];
    const result = removeCommentById(comments, "1-1-1");
    expect(result[0].replies[0].replies).toHaveLength(0);
  });

  test("returns unchanged array when id does not exist", () => {
    const comments = [makeComment("1"), makeComment("2")];
    const result = removeCommentById(comments, "999");
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("1");
    expect(result[1].id).toBe("2");
  });

  test("returns empty array when removing the only comment", () => {
    const comments = [makeComment("1")];
    const result = removeCommentById(comments, "1");
    expect(result).toEqual([]);
  });

  test("does not mutate the original array", () => {
    const comments = [makeComment("1"), makeComment("2")];
    removeCommentById(comments, "1");
    expect(comments).toHaveLength(2);
  });
});

describe("updateCommentContent", () => {
  test("updates content of a top-level comment by id", () => {
    const comments = [makeComment("1")];
    const result = updateCommentContent(comments, "1", "updated");
    expect(result[0].content).toBe("updated");
  });

  test("updates content of a nested reply by id", () => {
    const comments = [makeComment("1", [makeComment("1-1")])];
    const result = updateCommentContent(comments, "1-1", "updated");
    expect(result[0].replies[0].content).toBe("updated");
  });

  test("updates content of a deeply nested reply by id", () => {
    const comments = [makeComment("1", [makeComment("1-1", [makeComment("1-1-1")])])];
    const result = updateCommentContent(comments, "1-1-1", "updated");
    expect(result[0].replies[0].replies[0].content).toBe("updated");
  });

  test("leaves other comments unchanged when updating by id", () => {
    const comments = [makeComment("1"), makeComment("2")];
    const result = updateCommentContent(comments, "1", "updated");
    expect(result[1].content).toBe("content-2");
  });

  test("returns unchanged array when id does not exist", () => {
    const comments = [makeComment("1")];
    const result = updateCommentContent(comments, "999", "updated");
    expect(result[0].content).toBe("content-1");
  });

  test("does not mutate the original array", () => {
    const comments = [makeComment("1")];
    const original = comments[0].content;
    updateCommentContent(comments, "1", "updated");
    expect(comments[0].content).toBe(original);
  });
});
