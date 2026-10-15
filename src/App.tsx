import { useEffect, useState, type ReactNode } from "react";
import {
  HashRouter,
  Routes,
  Route,
  Link,
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  ArrowRight,
  ChevronRight,
  Search,
  FileText,
  ClipboardList,
  FolderOpen,
  ShieldCheck,
  Clock3,
  Menu,
  X,
  Download,
  Printer,
  Plus,
  Check,
  ArrowUpRight,
  Building2,
} from "lucide-react";
import { Brand, Button, Notice, PageHeading } from "./components/UI";
import { CaseProvider, useCases } from "./storage/CaseContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import ApplicationPage from "./pages/ApplicationPage";
import {
  ReceiptPage,
  ProcessingPage,
  ResultPage,
  ResponsePage,
} from "./pages/CasePages";
import { CasesPage, DocumentsPage } from "./pages/ArchivePages";
import {
  ServicesPage,
  ServiceDetail,
  AboutPage,
  HelpPage,
} from "./pages/InformationPages";
import s from "./App.module.css";

const base = import.meta.env.BASE_URL;
export function Layout({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const links = [
    ["/about", "기관소개"],
    ["/services", "민원서비스"],
    ["/my-cases", "나의 민원"],
    ["/documents", "발급문서"],
    ["/help", "이용안내"],
  ];
  const section =
    links.find(([path]) => location.pathname.startsWith(path)) ??
    (location.pathname === "/apply"
      ? links[1]
      : /^\/(receipt|processing|result|supplement|appeal)\//.test(
            location.pathname,
          )
        ? links[2]
        : undefined);
  return (
    <>
      <a
        href="#main"
        className={s.skip}
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main")?.focus();
          document.getElementById("main")?.scrollIntoView();
        }}
      >
        본문 바로가기
      </a>
      <div className={s.topStrip}>
        <div className={s.container}>
          <span className={s.virtualBadge}>가상 행정서비스</span>
          <span>일상의 사유를 심사하고 문서로 발급하는 창작 누리집입니다.</span>
          <Link to="/help">
            서비스 안내 <ChevronRight size={12} />
          </Link>
        </div>
      </div>
      <header className={s.header}>
        <div className={s.container}>
          <Link to="/" aria-label="국립핑계관리청 홈">
            <Brand />
          </Link>
          <span className={s.portalName}>전자민원포털</span>
          <div className={s.utility}>
            <span>
              <Clock3 size={15} /> 24시간 온라인 접수
            </span>
            <Link to="/help">이용안내</Link>
            <Link to="/my-cases">
              나의 민원 <ArrowUpRight size={14} />
            </Link>
          </div>
          <button
            className={s.menuButton}
            aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <nav
        className={`${s.nav} ${menuOpen ? s.navOpen : ""}`}
        aria-label="주 메뉴"
      >
        <div className={s.container}>
          {links.map(([path, label]) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                isActive || path === section?.[0] ? s.navActive : ""
              }
              onClick={() => setMenuOpen(false)}
            >
              {label}
              <ChevronRight size={16} />
            </NavLink>
          ))}
          <span className={s.navCaption}>사소한 사유도, 정식 절차로.</span>
        </div>
      </nav>
      <main id="main" tabIndex={-1}>
        <StorageNotice />
        {location.pathname !== "/" && (
          <div className={`${s.container} ${s.breadcrumb}`}>
            <Link to="/">홈</Link>
            <ChevronRight size={13} />
            <span>
              {section?.[1] ??
                (location.pathname === "/design"
                  ? "디자인 검토"
                  : "민원서비스")}
            </span>
          </div>
        )}
        {children}
      </main>
      <footer className={s.footer}>
        <div className={s.container}>
          <div className={s.footerLinks}>
            <Link to="/about">기관소개</Link>
            <Link to="/help?topic=storage">저장 및 기록 안내</Link>
            <Link to="/help?topic=sources">디자인·자료 출처</Link>
            <a
              href="https://github.com/ARU-Tris/national-excuse-office"
              target="_blank"
              rel="noreferrer"
            >
              GitHub <ArrowUpRight size={14} />
            </a>
          </div>
          <div className={s.footerMain}>
            <Brand />
            <div>
              <p>
                국립핑계관리청은 실제 국가기관과 관계없는 풍자 창작기관입니다.
              </p>
              <p>
                신청 내용은 사용 중인 브라우저에 저장되며 외부로 전송되지
                않습니다.
              </p>
              <small>
                © 2026 NATIONAL EXCUSE OFFICE. 모든 사유에는 접수번호가
                부여됩니다.
              </small>
            </div>
            <span className={s.footerMark}>
              가상의 기관.
              <br />
              진지한 절차.
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}
export function Home() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const tasks = ["학업·과제", "청소", "운동", "정리", "답장", "개인 일정"];
  return (
    <>
      <section className={s.hero}>
        <div className={`${s.container} ${s.heroInner}`}>
          <div className={s.heroCopy}>
            <p className={s.eyebrow}>
              <span />
              국립핑계관리청 전자민원서비스
            </p>
            <h1>
              모든 사유에는
              <br />
              <em>접수번호</em>가 부여됩니다.
            </h1>
            <p className={s.heroDescription}>
              미루고 싶은 오늘의 일, 정식으로 신청하세요.
              <br />
              귀하의 사소한 사유를 엄정한 절차에 따라 검토하겠습니다.
            </p>
            <form
              className={s.searchBox}
              onSubmit={(e) => {
                e.preventDefault();
                navigate(
                  `/services${query ? `?q=${encodeURIComponent(query)}` : ""}`,
                );
              }}
            >
              <Search size={22} />
              <input
                aria-label="민원 검색"
                placeholder="무엇을 유예하고 싶으신가요?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button aria-label="검색">
                <ArrowRight size={23} />
              </button>
            </form>
            <p className={s.popularSearch}>
              <strong>자주 찾는 사유</strong>
              {["과제 미루기", "잠깐 쉬기", "내일의 나에게"].map((q) => (
                <Link to={`/services?q=${encodeURIComponent(q)}`} key={q}>
                  {q}
                </Link>
              ))}
            </p>
          </div>
          <div
            className={s.heroArtwork}
            aria-label="국립핑계관리청 처리결과 통지서 예시"
          >
            <span className={s.artworkGuide}>NEO / OFFICIAL DOCUMENT</span>
            <img
              className={s.heroEmblem}
              src={`${base}brand/emblem.svg`}
              alt=""
            />
            <div className={s.paperBack} />
            <img
              className={s.heroPaper}
              src={`${base}samples/F-06-sample.png`}
              alt="기관 심벌과 붉은 관인을 담은 일상업무 유예신청 처리결과 통지서"
            />
            <span className={s.artworkCaption}>
              <span />
              엄정한 심사, 정교한 문서.
            </span>
          </div>
        </div>
      </section>
      <div className={`${s.container} ${s.quickServices}`}>
        {[
          {
            icon: ClipboardList,
            title: "민원 신청하기",
            desc: "일상업무 유예 심사를 신청합니다.",
            to: "/services/defer",
            number: "01",
          },
          {
            icon: Search,
            title: "처리상태 조회",
            desc: "접수한 민원의 진행상태를 확인합니다.",
            to: "/my-cases",
            number: "02",
          },
          {
            icon: FolderOpen,
            title: "발급문서 확인",
            desc: "처리결과와 관련 서류를 발급합니다.",
            to: "/documents",
            number: "03",
          },
        ].map((item) => (
          <Link to={item.to} className={s.quickService} key={item.to}>
            <item.icon size={32} strokeWidth={1.5} />
            <div>
              <span>{item.number} · 전자민원</span>
              <h2>{item.title}</h2>
              <p>{item.desc}</p>
            </div>
            <ArrowRight className={s.quickArrow} size={22} />
          </Link>
        ))}
      </div>
      <section className={`${s.container} ${s.homeGrid}`}>
        <div className={s.frequent}>
          <div className={s.sectionHead}>
            <h2>자주 찾는 민원</h2>
            <Link to="/services">
              전체보기 <Plus size={18} />
            </Link>
          </div>
          <Link to="/services/defer" className={s.featuredService}>
            <div>
              <span className={s.tag}>온라인 신청</span>
              <h3>일상업무 유예 심사</h3>
              <p>
                오늘의 의무와 귀하의 사정 사이,
                <br />
                행정적 검토가 필요한 순간.
              </p>
              <span className={s.serviceMetadata}>
                수수료 없음 <i /> 별도 회원가입 없음
              </span>
            </div>
            <FileText size={60} strokeWidth={1} />
            <ArrowUpRight size={22} />
          </Link>
          <div className={s.taskChips}>
            {tasks.map((task, index) => (
              <Link
                to={`/apply?category=${["study", "clean", "exercise", "organize", "reply", "other"][index]}`}
                key={task}
              >
                {task}
                <ChevronRight size={14} />
              </Link>
            ))}
          </div>
        </div>
        <div className={s.notices}>
          <div className={s.sectionHead}>
            <h2>기관 공지사항</h2>
            <Link to="/help">
              더보기 <Plus size={18} />
            </Link>
          </div>
          {[
            [
              "안내",
              "전자민원포털 운영 및 기록 보관 안내",
              "2026.10.15.",
              "storage",
            ],
            [
              "심사",
              "의욕 부족 사유의 심사기준을 알려드립니다",
              "2026.10.15.",
              "review",
            ],
            [
              "발급",
              "발급문서 9종 및 PDF 인쇄 안내",
              "2026.10.15.",
              "printing",
            ],
            [
              "공지",
              "본 청은 내일의 의욕을 보증하지 않습니다",
              "2026.10.15.",
              "virtual",
            ],
          ].map(([tag, title, date, topic]) => (
            <Link
              to={`/help?topic=${topic}`}
              className={s.noticeRow}
              key={title}
            >
              <span>{tag}</span>
              <strong>{title}</strong>
              <time>{date}</time>
              <ChevronRight size={15} />
            </Link>
          ))}
          <Link to="/help?topic=storage" className={s.privacyNote}>
            <ShieldCheck size={21} />
            <span>
              <strong>귀하의 사유는 이 브라우저에만 보관됩니다.</strong>
              <small>개인정보 입력 없이, 외부 전송 없이.</small>
            </span>
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
      <section className={s.processSection}>
        <div className={s.container}>
          <div className={s.sectionHead}>
            <div>
              <p className={s.eyebrow}>민원 처리절차</p>
              <h2>사유는 가볍게, 절차는 빈틈없이.</h2>
            </div>
            <Link to="/services/defer">
              절차 자세히 보기 <ArrowRight size={18} />
            </Link>
          </div>
          <ol className={s.processList}>
            {[
              ["01", "민원 접수", "사유를 작성하면 접수번호가 부여됩니다."],
              ["02", "사유 심사", "구체성과 유예 적정성을 검토합니다."],
              ["03", "내부 결재", "가상 심사관이 처분안을 확정합니다."],
              ["04", "문서 발급", "결과를 정식 공문서 PDF로 발급합니다."],
            ].map(([num, title, desc]) => (
              <li key={num}>
                <span>{num}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </div>
                <ChevronRight size={21} />
              </li>
            ))}
          </ol>
          <p className={s.processFootnote}>
            심사 및 결재는 규칙 기반 프로그램의 시뮬레이션입니다. 실제 의무와
            기한은 변경되지 않습니다.
          </p>
        </div>
      </section>
    </>
  );
}
export function DesignReview() {
  const [code, setCode] = useState("F-06");
  return (
    <div className={`${s.container} ${s.page}`}>
      <PageHeading
        eyebrow="브랜드·서식 자료"
        title="기관의 정체성과 문서 디자인"
        description="확정된 기관 상징과 대표 공문서의 예시를 확인할 수 있습니다."
      />
      <Notice>
        선정된 A안 유예문장과 공문서 예시입니다. 아래 이미지는 실제 벡터 PDF를
        렌더링한 것입니다. 실제 민원 기록과 구별되는 예시 자료입니다.
      </Notice>
      <div className={s.designConcepts}>
        {[
          ["emblem", "A · 유예문장", "권장안 · 문서와 비어 있는 결재칸"],
          ["concept-b", "B · 사유의 질서", "네 단계의 사각 질서"],
          ["concept-c", "C · 심사 인장", "사각틀과 이중의 추상 선"],
        ].map(([file, title, desc]) => (
          <div key={file}>
            <img src={`${base}brand/${file}.svg`} alt={title} />
            <h2>{title}</h2>
            <p>{desc}</p>
          </div>
        ))}
      </div>
      <div className={s.designSeal}>
        <img
          src={`${base}brand/seal-square-red.svg`}
          alt="국립핑계관리청장인, 3행 3열 사각 가상 관인"
        />
        <div>
          <h2>국립핑계관리청장인</h2>
          <p>
            9자 인영을 벡터 윤곽으로 조형한 25mm 사각 관인.
            <br />
            기관장 명의의 발신 공문에만 사용합니다.
          </p>
        </div>
      </div>
      <div className={s.tabs} role="group" aria-label="대표 공문서">
        {[
          ["F-06", "처리결과 통지서"],
          ["F-05", "내부결재서"],
          ["F-07", "승인 결정통지서"],
        ].map(([value, label]) => (
          <button
            className={code === value ? s.tabActive : ""}
            key={value}
            onClick={() => setCode(value)}
          >
            {value} {label}
          </button>
        ))}
      </div>
      <img
        className={s.designPdf}
        style={{
          objectFit: "contain",
          height: "auto",
          maxHeight: 1000,
          background: "#f4f6f8",
        }}
        alt={`${code} 실제 PDF 렌더링`}
        src={`${base}samples/${code}-sample.png`}
      />
      <div className={s.actions}>
        <a
          className={s.button}
          href={`${base}samples/${code}-sample.pdf`}
          download
        >
          <Download size={18} />
          시안 PDF 내려받기
        </a>
        <Button secondary to="/">
          홈 시안
        </Button>
        <Button secondary to="/apply">
          신청 화면 시안
        </Button>
        <Button secondary to="/documents">
          발급문서
        </Button>
      </div>
    </div>
  );
}
function StorageNotice() {
  const { persistent, error, ready } = useCases();
  return ready && (!persistent || error) ? (
    <div className={s.container}>
      <Notice>
        {error ||
          "브라우저 저장소를 사용할 수 없어 현재 탭에만 임시 보관합니다. 새로고침 전 나의 민원에서 JSON 백업을 내려받아 주세요."}
        <Link to="/my-cases"> 기록 백업하기</Link>
      </Notice>
    </div>
  ) : null;
}
function RouteFocus() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    const timer = requestAnimationFrame(() =>
      document
        .querySelector<HTMLElement>("main h1")
        ?.focus({ preventScroll: true }),
    );
    return () => cancelAnimationFrame(timer);
  }, [location.pathname]);
  return null;
}
export default function App() {
  return (
    <ErrorBoundary>
      <CaseProvider>
        <HashRouter>
          <RouteFocus />
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/design" element={<DesignReview />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/services/defer" element={<ServiceDetail />} />
              <Route path="/apply" element={<ApplicationPage />} />
              <Route path="/receipt/:id" element={<ReceiptPage />} />
              <Route path="/processing/:id" element={<ProcessingPage />} />
              <Route path="/result/:id" element={<ResultPage />} />
              <Route path="/supplement/:id" element={<ResponsePage />} />
              <Route path="/appeal/:id" element={<ResponsePage appeal />} />
              <Route path="/my-cases" element={<CasesPage />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/help" element={<HelpPage />} />
              <Route
                path="*"
                element={
                  <div className={`${s.container} ${s.page}`}>
                    <PageHeading
                      title="페이지를 찾을 수 없습니다."
                      description="주소를 확인하거나 아래 버튼으로 홈으로 이동해 주세요."
                    />
                    <Button to="/">홈으로 이동</Button>
                  </div>
                }
              />
            </Routes>
          </Layout>
        </HashRouter>
      </CaseProvider>
    </ErrorBoundary>
  );
}
