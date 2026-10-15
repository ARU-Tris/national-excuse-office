import { Component, type ReactNode } from "react";
import s from "../App.module.css";
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main
          style={{
            maxWidth: 760,
            margin: "70px auto",
            padding: 24,
            fontFamily: "sans-serif",
          }}
        >
          <h1>화면을 불러오지 못했습니다.</h1>
          <p>
            민원 기록은 브라우저에 보관되어 있습니다. 페이지를 다시 연 뒤 나의
            민원을 확인해 주세요.
          </p>
          <button onClick={() => window.location.reload()}>
            페이지 다시 열기
          </button>
        </main>
      );
    return this.props.children;
  }
}
export class DocumentBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <div className={s.notice} role="alert">
          <div>
            <strong>문서 발급기를 불러오지 못했습니다.</strong>
            <p>
              연결을 확인하고 페이지를 다시 열어 주세요. 민원 기록과 처리결과는
              그대로 보관되어 있습니다.
            </p>
            <button
              className={s.textButton}
              onClick={() => window.location.reload()}
            >
              문서 발급기 다시 불러오기
            </button>
          </div>
        </div>
      );
    return this.props.children;
  }
}
