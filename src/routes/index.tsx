import { createFileRoute } from "@tanstack/react-router";
import Sidebar from "../components/Navigation/Sidebar";
import Header from "../components/Header/Header";
import Dashboard from "../components/Dashboard/Dashboard";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <>
      <Header />
      <div className="flex flex-col h-full px-6 pb-6">
        <div className="flex h-[calc(100vh-100px)] gap-6">
          <div className="w-64 shrink-0">
            <Sidebar />
          </div>
          <div className="flex-1 bg-[#0a0a0a] rounded-3xl border border-white/5 overflow-hidden relative">
            {/* Background gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
              <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/5 blur-[100px]" />
              <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/5 blur-[100px]" />
            </div>
            
            <div className="relative z-10 h-full">
              <Dashboard />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
