---
title: 细节说明（步骤与查找优先级）
date: 2025-03-01 00:00:00
categories:
  - PwnCollege
tags:
  - PwnCollege
  - CTF
---

**Bash 在查找命令时会优先使用 shell 函数（如果存在）**，而不是去执行 PATH 中的外部可执行文件。所以当你在 zardus 的启动文件里 **定义**（但不执行）一个名为 `flag_checker` 的函数，后来在交互里用户输入 `flag_checker` 时，shell 调用的就是你定义的函数，从而完全拦截了对 `/challenge/bin/flag_checker` 的调用。

# 细节说明（步骤与查找优先级）
+ 真实的外部程序（你贴的那个）行为是：打印提示、`read -r candidate`，把输入和 `/flag` 内容比较，输出 Correct/Incorrect。
+ Bash 的命令解析顺序（简化版）：**shell 函数 → shell builtin → hashed/PATH 可执行文件 → 外部命令的绝对路径**。  
因此，只要存在名为 `flag_checker` 的函数，shell 就不会去 PATH 找那个 `/challenge/bin/flag_checker`，而是直接执行函数体。
+ 这就是你用函数成功的根本原因：你把劫持代码放在了函数里（且精确打印了挑战检测的提示文本），所以当 Zardus 在会话中敲 `flag_checker` 时，调用的是你的代码。

# 为什么函数必须“被定义但不执行”？
如果你在 `.bashrc` 中直接做 `echo`/`read`（立即执行交互），登录过程会在 `flag_checker` 被调用之前就出现提示，挑战会检测到“登录时出现异常提示”并把 Zardus spooked。定义函数只是把代码放到名字下，不会在登录时触发，等到 `flag_checker` 被主动调用时才运行——这正是“被动劫持”的关键。

# 和真实程序的关系
+ 真实程序仍然存在于 `/challenge/bin/flag_checker`，并且做了真正的校验；但它**没有被调用**，因为 shell 在命令解析阶段选择了函数版本。
+ 唯一会绕开你函数的情况是：调用者使用**绝对路径**（比如 `/challenge/bin/flag_checker`）来执行真实程序，或者启动的 shell 严格禁止函数（或清理/不继承用户定义的函数）。在本题中，挑战是直接以命令名 `flag_checker` 调用，所以函数劫持生效。

# 小结
1. 你在 zardus 的启动文件里定义了 `flag_checker()`（不会立即执行）。
2. 当 zardus 在交互里运行 `flag_checker` 时，shell 找到并调用了你的函数。
3. 你的函数打印了挑战期待的提示、读取并回显输入（并可将其写到文件），于是你得到了 flag；真正的检查程序未被执行（因未被调用）。  
  
  
  


## 概述 — “sniffing input” 在本题中的含义
“Sniffing input”（嗅探输入）并非指某个特定目录或单一进程的开关，而是指在何处/何时被动地读取并记录了受害者在交互式会话中输入的内容。成功嗅探意味着攻击者在某个可被执行或调用的上下文中读取了受害者的输入并将其保存或回显，从而实现信息外泄（flag exfiltration）。

---

## 常见的嗅探实现方式（可能的触发位置）
1. **Shell 函数劫持（在受害者的启动文件中定义函数）**  
在受害者的 `~/.bashrc`（或其他被读取的启动文件）中定义一个与目标命令同名的 shell 函数，函数体包含 `read`/回显/持久化逻辑。函数为“被动”定义，不在登录时执行；当受害者在交互式 shell 中调用该命令时，shell 优先执行函数，从而读取并处理输入。
2. **PATH 劫持（放置伪造可执行文件）**  
将伪造的可执行文件（同名命令）放置在 PATH 中优先级更高的目录（例如 `~/bin`）并确保该目录位于 PATH 前面。受害者执行命令时会运行伪造程序，程序内可通过 `read` 读取输入并保存/回显。
3. **父进程环境继承（在父进程中临时修改 PATH）**  
在攻击者的 shell 中临时修改环境（例如 `export PATH="$HOME/bin:$PATH"`），然后在同一进程树中启动目标程序，使其继承该环境。此法在攻击场景中常用于绕过对目标用户主目录的写权限限制。
4. **被 source 的共享脚本或全局配置（较罕见）**  
如果某个被受害者 shell source 的共享文件可被写入（或存在路径被攻击者控制），该文件中的交互读取逻辑亦可嗅探输入。该情况较少见，依赖具体环境配置。

---

## 为什么定义 shell 函数能成功（优先级与行为）
+ Bash 的命令解析顺序（简化）通常为：**shell 函数 → shell builtin → hashed/PATH 可执行文件 → 外部可执行文件的绝对路径**。
+ 因此，在受害者的启动文件中**定义**与目标命令同名的函数会使该函数在命令调用时被优先执行，从而劫持原本位于文件系统中的可执行程序。
+ 函数定义本身不会在登录时触发交互提示；只有在受害者主动执行命令时函数才会运行，避免了在登录阶段产生可疑交互并触发检测（即“spooked”行为）。

---

## 如何确认嗅探实际发生的位置（推荐步骤）
下列步骤按优先级排列，便于快速确认嗅探是通过函数、脚本还是其他方式实现。

### 1) 检查是否已持久化 flag（最快）
在攻击者环境或目标可访问的路径中查找可能的持久化文件，例如：

```plain
ls -l ~/stolen_flag /home/zardus/stolen_flag 2>/dev/null || true
cat ~/stolen_flag 2>/dev/null || cat /home/zardus/stolen_flag 2>/dev/null || echo "(no stolen_flag visible)"
```

若文件存在且包含 flag，则嗅探行为是在某次执行期间将输入写入了该文件。

### 2) 在受害者会话中检查当前命令解析（必须在受害者交互式 shell 内）
在受害者 session 中运行：

```plain
type -a flag_checker
# 或（某些 shell）
command -v -a flag_checker
```

+ 若输出显示 `flag_checker is a function`，说明函数劫持正在生效。
+ 若输出显示指向 `~/bin/flag_checker` 或其它非系统路径，说明 PATH 劫持或父进程环境继承生效。
+ 若输出直接为绝对路径（例如 `/challenge/bin/flag_checker`），说明没有劫持成功（该情形与已获取 flag 的事实矛盾，除非嗅探通过其它途径发生）。

### 3) 在受害者家目录中查找启动文件中的定义（攻击者有读取权限时）
查看受害者的登录/交互启动文件：

```plain
sed -n '1,240p' /home/zardus/.bashrc
grep -n "flag_checker" /home/zardus/.bashrc 2>/dev/null || echo "no flag_checker in /home/zardus/.bashrc"
```

若发现函数定义或 PATH 前置语句，说明劫持点即在该启动文件。

### 4) 在攻击者可写目录检查伪造脚本（若采用 PATH 劫持或父进程继承）
```plain
ls -l ~/bin/flag_checker 2>/dev/null || echo "no ~/bin/flag_checker"
sed -n '1,200p' ~/bin/flag_checker 2>/dev/null || true
```

若伪造脚本存在且包含 `read`/保存逻辑，则嗅探是通过该脚本实现。

---

## 一组汇总诊断命令（可直接执行）
在攻击者 shell（hacker）执行：

```plain
echo "=== stolen flags ==="
ls -l ~/stolen_flag /home/zardus/stolen_flag 2>/dev/null || true
cat ~/stolen_flag 2>/dev/null || cat /home/zardus/stolen_flag 2>/dev/null || echo "(no stolen_flag visible)"

echo "=== search for flag_checker in /home/zardus/.bashrc ==="
grep -n "flag_checker" /home/zardus/.bashrc 2>/dev/null || echo "no flag_checker in /home/zardus/.bashrc"

echo "=== check hacker ~/bin/flag_checker ==="
ls -l ~/bin/flag_checker 2>/dev/null || echo "no ~/bin/flag_checker"
sed -n '1,200p' ~/bin/flag_checker 2>/dev/null || true
```

在受害者会话（victim）中执行：

```plain
type -a flag_checker
command -v -a flag_checker
```

---

## 常见失败或避免检测的注意事项
+ 切勿在受害者的交互启动脚本中放置会立即执行的交互命令（如直接的 `echo "Type the flag"` 与 `read`），否则此类行为会在登录时出现可疑提示并被检测（导致“spooked”）。应使用被动方式（函数定义或 PATH 前置）。
+ 命令提示字符串必须与期望精确匹配（标点、空格、换行行为）。
+ 若目标程序通过绝对路径调用或启动器在创建受害者会话时会清理/重置环境（例如重设 PATH 或禁止继承函数），上述劫持方法将失效。
+ 为稳妥起见，嗅探逻辑可同时回显输入并将内容写入文件，以防 stdout 被隔离。

---

## 清理与复盘建议
+ 若需清理痕迹，建议从受害者的启动文件中移除所添加的函数定义或 PATH 修改，并删除任何持久化的盗取文件（例如 `~/stolen_flag`）。示例清理命令（谨慎执行）：

```plain
# 备份并编辑 .bashrc（示例：用 sed 删除加入的特定注释块）
cp /home/zardus/.bashrc /home/zardus/.bashrc.bak
# 假设有标记行 "## ensure ~/bin is first in PATH (added by hacker)"，可用 awk/sed 删除块
# 手动审阅并删除更安全
```