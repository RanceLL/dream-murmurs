# 静态梦境卡面

请把生成好的卡图按编号放入本目录：

| 文件名 | 对应卡 |
|--------|--------|
| `000.jpg` | 锈蚀的心跳 |
| `001.jpg` | 螺旋桨的航道 |
| `002.jpg` | 水晶的回声 |
| `003.jpg` | 云上的工房 |
| `004.jpg` | 废弃的轨道 |
| `005.jpg` | 机械鸟的巢 |
| `006.jpg` | 巨手的阴影 |
| `007.jpg` | 灯塔齿轮 |
| `008.jpg` | 风车与管道 |
| `009.jpg` | 要塞的裂缝 |
| `010.jpg` | 飞行石的孩子 |
| `011.jpg` | 沉睡的舰桥 |

- 建议尺寸：400×600（竖版 2:3）
- 格式：JPG（质量约 85）或 WebP
- 元数据见上级目录 `cards-meta.json`

## 如何上传图片

### 方法 A：GitHub 网页（最简单）
1. 打开 https://github.com/RanceLL/dream-murmurs/tree/main/assets/cards
2. 点 **Add file → Upload files**
3. 把 `000.jpg` … `011.jpg` 拖进去
4. 写 commit message，例如 `Add first 12 static card images`
5. 点 **Commit changes**

若站点部署在 `gh-pages` 分支，把同样文件再上传到 gh-pages 的同一路径，或合并/同步两个分支。

### 方法 B：命令行
```bash
git clone https://github.com/RanceLL/dream-murmurs.git
cd dream-murmurs
# 把图片放到 assets/cards/
git add assets/cards/*.jpg
git commit -m "Add first 12 static card images"
git push origin main
```
