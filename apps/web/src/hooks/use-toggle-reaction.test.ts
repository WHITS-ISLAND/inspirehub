import { describe, expect, test } from "vitest";
import { updateReactionsInData } from "./use-toggle-reaction";

function makeReactions(like = 0, interested = 0, wantToTry = 0) {
  return {
    like: { count: like, is_reacted: false },
    interested: { count: interested, is_reacted: false },
    want_to_try: { count: wantToTry, is_reacted: false },
  };
}

describe("updateReactionsInData", () => {
  test("NodeDetail形状のデータでリアクションをオンに切り替える", () => {
    const data = { id: "node-1", reactions: makeReactions(3) };
    const result = updateReactionsInData(data, "node-1", "like");

    expect(result).toBe(true);
    expect(data.reactions.like.is_reacted).toBe(true);
    expect(data.reactions.like.count).toBe(4);
  });

  test("NodeDetail形状のデータでリアクションをオフに切り替える", () => {
    const data = {
      id: "node-1",
      reactions: {
        like: { count: 5, is_reacted: true },
        interested: { count: 0, is_reacted: false },
        want_to_try: { count: 0, is_reacted: false },
      },
    };
    const result = updateReactionsInData(data, "node-1", "like");

    expect(result).toBe(true);
    expect(data.reactions.like.is_reacted).toBe(false);
    expect(data.reactions.like.count).toBe(4);
  });

  test("NodesListResponse形状のデータで該当ノードのリアクションを切り替える", () => {
    const data = {
      nodes: [
        { id: "node-1", reactions: makeReactions(2) },
        { id: "node-2", reactions: makeReactions(1) },
      ],
      total: 2,
    };
    const result = updateReactionsInData(data, "node-1", "like");

    expect(result).toBe(true);
    expect(data.nodes[0].reactions.like.is_reacted).toBe(true);
    expect(data.nodes[0].reactions.like.count).toBe(3);
    expect(data.nodes[1].reactions.like.count).toBe(1);
  });

  test("NodesListResponse内に該当ノードがない場合falseを返す", () => {
    const data = {
      nodes: [{ id: "node-1", reactions: makeReactions() }],
      total: 1,
    };
    const result = updateReactionsInData(data, "node-999", "like");

    expect(result).toBe(false);
  });

  test("nullデータに対してfalseを返す", () => {
    expect(updateReactionsInData(null, "node-1", "like")).toBe(false);
  });

  test("is_reactedが未定義の場合オフからオンに切り替える", () => {
    const data = {
      id: "node-1",
      reactions: {
        like: { count: 0 },
        interested: { count: 0 },
        want_to_try: { count: 0 },
      },
    };
    const result = updateReactionsInData(data, "node-1", "like");

    expect(result).toBe(true);
    expect(data.reactions.like.count).toBe(1);
  });

  test("interestedタイプを正しく切り替える", () => {
    const data = { id: "node-1", reactions: makeReactions(0, 7) };
    const result = updateReactionsInData(data, "node-1", "interested");

    expect(result).toBe(true);
    expect(data.reactions.interested.is_reacted).toBe(true);
    expect(data.reactions.interested.count).toBe(8);
  });

  test("want_to_tryタイプを正しく切り替える", () => {
    const data = { id: "node-1", reactions: makeReactions(0, 0, 2) };
    const result = updateReactionsInData(data, "node-1", "want_to_try");

    expect(result).toBe(true);
    expect(data.reactions.want_to_try.is_reacted).toBe(true);
    expect(data.reactions.want_to_try.count).toBe(3);
  });
});
