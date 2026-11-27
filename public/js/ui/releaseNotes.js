// 说明弹窗（重构版改写）：原来的「更新说明」读取 CHANGELOG.md 的更新日志已移除，
// 只保留玩家真正用得上的两栏：游玩说明、关于（资源来源与版权）。
import { useEffect, useState } from '../../vendor/hooks.module.js';
import { html, Modal, Button } from './components.js';
import { createStore, useStore, selectRoute } from '../store.js';
import { APP_VERSION } from '../../../shared/constants.js';

const request = createStore({ serial: 0 });

export function ReleaseNotesButton() {
  return html`<button type="button" class="title-repo release-notes-entry" onClick=${() => request.set((s) => ({ serial: s.serial + 1 }))}>游玩说明</button>`;
}

function Block({ title, children }) {
  return html`<section class="guide-block">
    <h3>${title}</h3>
    ${children}
  </section>`;
}

function PlayGuide() {
  return html`<article class="release-notes-body">
    <${Block} title="一、开局流程">
      <ul>
        <li>输入博士代号 → 开始 → 进入大厅。</li>
        <li>「独立模拟」单人开局；「同盟模拟」最多 4 人协同。</li>
        <li>同盟由房主创建房间，把 4 位房间码发给队友；队友用「密钥加入」输入房间码进入。</li>
        <li>房间内可加 AI 队友补位，人齐后由房主开始。</li>
      </ul>
    <//>
    <${Block} title="二、玩法要点">
      <ul>
        <li>用资金招募干员、布置防线，抵御多波进攻，直到击败敌方领袖。</li>
        <li>回合之间可调整阵容并升级据点；干员有职业、费用与朝向，摆位决定覆盖范围。</li>
        <li>对局战斗在各自浏览器中计算，服务器只同步房间、回合、经济与公共状态。</li>
        <li>断线会自动重连；同一代号重复进入会把旧连接踢掉。</li>
      </ul>
    <//>
    <${Block} title="三、资源与缓存">
      <ul>
        <li>首次打开先跑一遍资源预下载：全部文件写入浏览器本地缓存，完成前不进入主页。</li>
        <li>之后再打开只核对缓存，不再重复下载；清理浏览器数据或换设备需要重新下一次。</li>
        <li>标题页「资源管理」可查看缓存占用、补下缺失文件。</li>
        <li>本版为 Lite：不含语音、背景音乐、音效、敌方与干员 Spine、教程图与结算图。</li>
      </ul>
    <//>
    <${Block} title="四、设置与显示">
      <ul>
        <li>右上角可切换语言；设置里可调文字大小、界面缩放、屏幕方向与全屏。</li>
        <li>横屏体验最佳；手机竖屏会提示旋转设备。</li>
      </ul>
    <//>
  </article>`;
}

function Repo() {
  return html`<article class="release-notes-body">
    <${Block} title="项目仓库">
      <ul>
        <li>原版开源项目：<a href="https://github.com/sganggs/Stronghold-Protocol" target="_blank" rel="noopener noreferrer">github.com/sganggs/Stronghold-Protocol</a>（GPL-3.0-or-later）</li>
        <li>本 Lite 部署版的代码来源、素材来源与许可，见「关于」页。</li>
      </ul>
    <//>
    <${Block} title="反馈">
      <p>规则与当前版本不一致、页面打不开、资源下载失败，都可以到上面仓库的 Issues 区反馈。</p>
    <//>
  </article>`;
}

function About() {
  return html`<article class="release-notes-body">
    <${Block} title="本重构版">
      <p>基于开源项目 Stronghold-Protocol v${APP_VERSION} 的底层代码重新构建，独立部署、独立素材包，不在原站代码上修改。删除了原版的更新日志与入场动画，并新增首屏资源预下载门。</p>
    <//>
    <${Block} title="代码来源">
      <ul>
        <li>Stronghold-Protocol（GitHub: sganggs/Stronghold-Protocol）v0.4.0，许可证 GPL-3.0-or-later。</li>
        <li>前端运行时：PixiJS、pixi-spine、Preact、htm、three.js、acorn、SES。</li>
      </ul>
    <//>
    <${Block} title="素材来源：原站">
      <ul>
        <li>站点：stronghold.luobomiao.love（同人部署版）；其页面结构、资源清单 data/assets.json、local-assets.json 与运行配置作为重构参考。</li>
        <li>素材 CDN：assets.luobomiao.love；UI 图标、界面底图、赛季 Logo、头像、立绘、技能与模组图标、敌人图标、令牌等媒体文件取自该站镜像。</li>
        <li>原站注入的登录/账号门槛未包含在本重构版内。</li>
      </ul>
    <//>
    <${Block} title="素材来源：明日方舟">
      <ul>
        <li>角色立绘、头像、干员代号与职业图标、技能/模组图标、敌人与 Boss 图标、道具与令牌图标、部分界面素材，版权归上海鹰角网络科技有限公司 / Yostar 所有。</li>
        <li>本重构版仅作非官方同人学习交流，不含付费内容，不用于商业用途。</li>
      </ul>
    <//>
    <${Block} title="字体与其他">
      <ul>
        <li>Noto Sans SC / Noto Sans JP / Noto Sans KR / Noto Sans TC（SIL Open Font License）。</li>
        <li>Bender、Rajdhani、Oxanium、Novecento 等显示字体按其各自许可使用。</li>
      </ul>
    <//>
  </article>`;
}

export function ReleaseNotesHost() {
  const safe = useStore((s) => ['title', 'lobby'].includes(selectRoute(s)) && !s.ui.restoring);
  const serial = useStore((s) => s.serial, Object.is, request);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('play');
  useEffect(() => {
    if (serial > 0) setOpen(true);
  }, [serial]);
  const close = () => setOpen(false);
  const tabs = [
    { id: 'play', label: '游玩说明' },
    { id: 'about', label: '关于' },
    { id: 'repo', label: '项目仓库' },
  ];
  return html`<${Modal} open=${safe && open} title=${tab === 'play' ? '游玩说明' : tab === 'about' ? '关于' : '项目仓库'} micro="STRONGHOLD PROTOCOL LITE"
    class="release-notes" width="min(10rem, 94vw)" onClose=${close}
    actions=${html`${tabs.map((item) => html`<${Button} key=${item.id} variant=${tab === item.id ? 'primary' : 'secondary'}
      onClick=${() => setTab(item.id)}>${item.label}<//>`)}
      <${Button} onClick=${close}>关闭<//>`}>
    ${tab === 'play' ? html`<${PlayGuide} />` : tab === 'about' ? html`<${About} />` : html`<${Repo} />`}
  <//>`;
}
