'use client';

import { ClassroomSurface } from '@/components/classroom/ClassroomSurface';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState, Component, type ReactNode } from 'react';

// Error boundary for interactive components
class InteractiveErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

// Student minimalist mode: hide advanced UI elements
function StudentModeOverlay() {
  return (
    <style>{`
      /* Student mode: hide non-essential controls */
      [data-student-hide="true"] { display: none !important; }
    `}</style>
  );
}

export default function ClassroomDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const isStudentMode = searchParams.get('mode') === 'student';
  const [loadError, setLoadError] = useState(false);

  // Watch for iframe/interactive component load failures
  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      // Don't show fatal errors for interactive components - they degrade gracefully
      console.warn('Interactive component error:', e.message);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (loadError) {
    return (
      <div style={{ maxWidth: 400, margin: '100px auto', textAlign: 'center', fontFamily: 'system-ui' }}>
        <h2 style={{ color: '#7c3aed' }}>课程加载遇到问题</h2>
        <p style={{ color: '#666', marginTop: 12 }}>部分互动组件可能未完全加载，课程内容仍可正常阅读。</p>
        <button onClick={() => window.location.reload()}
          style={{ marginTop: 20, padding: '10px 24px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
          重新加载
        </button>
      </div>
    );
  }

  return (
    <>
      {isStudentMode && <StudentModeOverlay />}
      <InteractiveErrorBoundary
        fallback={
          <div style={{ maxWidth: 400, margin: '100px auto', textAlign: 'center', fontFamily: 'system-ui' }}>
            <h2 style={{ color: '#7c3aed' }}>互动组件降级模式</h2>
            <p style={{ color: '#666', marginTop: 12 }}>此页面的互动组件暂时无法运行，已切换为只读模式。文字和图片内容仍可正常查看。</p>
            <button onClick={() => window.location.reload()}
              style={{ marginTop: 20, padding: '10px 24px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
              重试
            </button>
          </div>
        }
      >
        <ClassroomSurface classroomId={params.id} variant="page" />
      </InteractiveErrorBoundary>
    </>
  );
}
