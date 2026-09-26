import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  }

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in media component:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-6 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg flex flex-col items-center justify-center gap-3 my-4">
            <p className="font-medium">Ocorreu uma falha ao renderizar esta seção.</p>
            <button
              onClick={() => {
                this.setState({ hasError: false })
                window.location.reload()
              }}
              className="px-4 py-1.5 bg-primary text-white rounded text-xs font-semibold hover:opacity-90"
            >
              Recarregar página
            </button>
          </div>
        )
      )
    }

    return this.props.children
  }
}
