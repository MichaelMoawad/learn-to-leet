// Python source run by the Python harness (SPEC 4.4).
//
// PRELUDE_PY is exec'd into every fresh user namespace before the user's code, so solutions can
// use ListNode, TreeNode and the common typing names exactly as on LeetCode. The codecs live here
// too: decoding builds nodes with whatever `ListNode` / `TreeNode` the namespace holds (the user may
// paste their own), and encoding duck-types on the usual field names.
//
// HARNESS_PY defines the driver in the interpreter's globals, outside the user namespace. It talks
// to JS in JSON strings only, so no Python objects leak across the boundary.

export const PRELUDE_PY = String.raw`
from typing import *
import collections, heapq, math, bisect, itertools, functools, string
from collections import deque, defaultdict, Counter, OrderedDict


class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

    def __repr__(self):
        return f"ListNode({self.val})"


class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

    def __repr__(self):
        return f"TreeNode({self.val})"


_LTL_MAX_NODES = 10000


def _ltl_list_from_json(values):
    head = None
    for v in reversed(values):
        head = ListNode(v, head)
    return head


def _ltl_list_to_json(head):
    out = []
    node = head
    while node is not None:
        if len(out) >= _LTL_MAX_NODES:
            raise ValueError("The returned linked list has more than 10,000 nodes. Is there a cycle?")
        if not hasattr(node, "val") or not hasattr(node, "next"):
            raise TypeError(f"Expected a ListNode but found {type(node).__name__}.")
        out.append(node.val)
        node = node.next
    return out


def _ltl_tree_from_json(values):
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue = collections.deque([root])
    i = 1
    while queue and i < len(values):
        node = queue.popleft()
        if i < len(values) and values[i] is not None:
            node.left = TreeNode(values[i])
            queue.append(node.left)
        i += 1
        if i < len(values) and values[i] is not None:
            node.right = TreeNode(values[i])
            queue.append(node.right)
        i += 1
    return root


def _ltl_tree_to_json(root):
    out = []
    queue = collections.deque([root])
    seen = 0
    while queue:
        node = queue.popleft()
        if node is None:
            out.append(None)
            continue
        seen += 1
        if seen > _LTL_MAX_NODES:
            raise ValueError("The returned tree has more than 10,000 nodes. Is there a cycle?")
        if not hasattr(node, "val"):
            raise TypeError(f"Expected a TreeNode but found {type(node).__name__}.")
        out.append(node.val)
        queue.append(getattr(node, "left", None))
        queue.append(getattr(node, "right", None))
    while out and out[-1] is None:
        out.pop()
    return out
`;

export const HARNESS_PY = String.raw`
import sys, json, time, traceback


class _LtlOut:
    def __init__(self):
        self.parts = []
        self.size = 0
        self.cut = False

    def write(self, s):
        s = str(s)
        if not self.cut:
            room = _LTL_STDOUT_LIMIT - self.size
            if len(s) > room:
                self.parts.append(s[:room])
                self.size = _LTL_STDOUT_LIMIT
                self.cut = True
            else:
                self.parts.append(s)
                self.size += len(s)
        return len(s)

    def flush(self):
        pass

    def isatty(self):
        return False

    def value(self):
        return "".join(self.parts) + (_LTL_STDOUT_TRUNCATED if self.cut else "")


class _LtlEncodeError(Exception):
    pass


_ltl_state = {"ns": None, "fn": None}


def _ltl_error(e):
    text = str(e)
    out = {"message": type(e).__name__ + (": " + text if text else "")}
    line = None
    for frame in traceback.extract_tb(e.__traceback__):
        if frame.filename == "solution.py":
            line = frame.lineno
    if line is not None:
        out["line"] = line
    return out


def _ltl_short(v):
    try:
        r = repr(v)
    except Exception:
        r = "<" + type(v).__name__ + ">"
    return r if len(r) <= 60 else r[:57] + "..."


def _ltl_plain(v, root):
    if v is None or isinstance(v, (bool, int, str)):
        return v
    if isinstance(v, float):
        if v != v or v in (float("inf"), float("-inf")):
            raise _LtlEncodeError(_ltl_bad(root, v))
        return v
    if isinstance(v, (list, tuple)):
        return [_ltl_plain(x, root) for x in v]
    if isinstance(v, dict):
        out = {}
        for k, x in v.items():
            if not isinstance(k, (str, int, float, bool)) and k is not None:
                raise _LtlEncodeError(_ltl_bad(root, k))
            out[k] = _ltl_plain(x, root)
        return out
    raise _LtlEncodeError(_ltl_bad(root, v))


def _ltl_bad(root, culprit):
    msg = f"Your function returned {_ltl_short(root)} ({type(root).__name__}), which cannot be turned into JSON."
    if culprit is not root:
        msg += f" The problem is {_ltl_short(culprit)} ({type(culprit).__name__}) inside it."
    return msg


def _ltl_decode(ns, value, kind):
    if kind == "linkedList":
        return ns["_ltl_list_from_json"](value)
    if kind == "tree":
        return ns["_ltl_tree_from_json"](value)
    return value


def _ltl_encode(ns, value, kind):
    if kind == "linkedList":
        value = ns["_ltl_list_to_json"](value)
    elif kind == "tree":
        value = ns["_ltl_tree_to_json"](value)
    return json.dumps(_ltl_plain(value, value), allow_nan=False)


def _ltl_compile(code, entry):
    ns = {"__name__": "__main__"}
    exec(_LTL_PRELUDE, ns)
    out = _LtlOut()
    saved = sys.stdout, sys.stderr
    sys.stdout = sys.stderr = out
    try:
        exec(compile(code, "solution.py", "exec"), ns)
    except SyntaxError as e:
        r = {"message": f"{type(e).__name__}: {e.msg}"}
        if e.lineno:
            r["line"] = e.lineno
        return json.dumps(r)
    except BaseException as e:
        return json.dumps(_ltl_error(e))
    finally:
        sys.stdout, sys.stderr = saved
    fn = ns.get(entry)
    if not callable(fn):
        return json.dumps({"message": f"Define a function named \x60{entry}\x60."})
    _ltl_state["ns"] = ns
    _ltl_state["fn"] = fn
    return ""


def _ltl_test(args_json, kinds_json, returns):
    ns = _ltl_state["ns"]
    kinds = json.loads(kinds_json)
    args = [_ltl_decode(ns, v, kinds[i] if i < len(kinds) else "json") for i, v in enumerate(json.loads(args_json))]
    out = _LtlOut()
    saved = sys.stdout, sys.stderr
    sys.stdout = sys.stderr = out
    start = time.perf_counter()
    try:
        result = _ltl_state["fn"](*args)
    except BaseException as e:
        ms = (time.perf_counter() - start) * 1000
        sys.stdout, sys.stderr = saved
        return json.dumps({"ok": False, "error": _ltl_error(e), "stdout": out.value(), "ms": ms})
    ms = (time.perf_counter() - start) * 1000
    sys.stdout, sys.stderr = saved
    try:
        actual = _ltl_encode(ns, result, returns)
    except _LtlEncodeError as e:
        return json.dumps({"ok": False, "error": {"message": str(e)}, "stdout": out.value(), "ms": ms})
    except BaseException as e:
        return json.dumps({"ok": False, "error": _ltl_error(e), "stdout": out.value(), "ms": ms})
    return json.dumps({"ok": True, "actualJson": actual, "stdout": out.value(), "ms": ms})
`;
