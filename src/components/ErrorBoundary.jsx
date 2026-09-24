import { Component } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error("Application render error:", error, info);
  }

  componentDidUpdate(previousProps) {
    if (this.state.failed && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ failed: false });
    }
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="fatal-error" role="alert">
        <AlertTriangle size={36} />
        <h1>This screen could not be displayed</h1>
        <p>Refresh the application to load a clean copy of the screen.</p>
        <button type="button" onClick={() => window.location.reload()}>
          <RefreshCw size={17} /> Refresh application
        </button>
      </main>
    );
  }
}
