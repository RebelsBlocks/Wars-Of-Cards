declare module 'react' {
  export = React;
  export as namespace React;

  namespace React {
    interface ReactNode {
      type?: any;
      props?: any;
      key?: any;
    }
    
    interface ReactElement<P = any, T extends string | JSXElementConstructor<any> = string | JSXElementConstructor<any>> {
      type: T;
      props: P;
      key: string | null;
    }

    type JSXElementConstructor<P> = ((props: P) => ReactElement<any, any> | null);
    
    interface FC<P = {}> {
      (props: P): ReactElement<any, any> | null;
      displayName?: string;
      defaultProps?: Partial<P>;
      propTypes?: any;
    }

    // Add createElement
    function createElement<P extends {}>(
      type: string | React.ComponentType<P>,
      props?: P | null,
      ...children: React.ReactNode[]
    ): React.ReactElement<P>;

    // Add memo
    function memo<T extends ComponentType<any>>(
      Component: T,
      propsAreEqual?: (prevProps: Readonly<ComponentProps<T>>, nextProps: Readonly<ComponentProps<T>>) => boolean
    ): MemoExoticComponent<T>;

    // Add component types
    type ComponentType<P = {}> = ComponentClass<P> | FC<P>;
    interface ComponentClass<P = {}, S = ComponentState> {
      new(props: P, context?: any): Component<P, S>;
      displayName?: string;
      defaultProps?: Partial<P>;
      propTypes?: any;
    }
    interface Component<P = {}, S = {}> {
      render(): ReactNode;
      readonly props: Readonly<P>;
      state: Readonly<S>;
      setState(state: S | ((prevState: Readonly<S>, props: Readonly<P>) => S | null)): void;
      forceUpdate(callback?: () => void): void;
      context: any;
    }
    type ComponentState = any;
    type ComponentProps<T> = T extends ComponentType<infer P> ? P : never;
    interface MemoExoticComponent<T extends ComponentType<any>> extends NamedExoticComponent<ComponentProps<T>> {
      readonly type: T;
    }
    interface NamedExoticComponent<P = {}> extends ExoticComponent<P> {
      displayName?: string;
    }
    interface ExoticComponent<P = {}> {
      (props: P): ReactElement | null;
    }

    // Add Dispatch and SetStateAction types
    type SetStateAction<S> = S | ((prevState: S) => S);
    type Dispatch<A> = (value: A) => void;

    // Hooks
    function useState<T>(initialState: T | (() => T)): [T, Dispatch<SetStateAction<T>>];
    function useEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
    function useContext<T>(context: Context<T>): T;
    function useCallback<T extends (...args: any[]) => any>(callback: T, deps: readonly any[]): T;

    // Context
    interface Context<T> {
      Provider: Provider<T>;
      Consumer: Consumer<T>;
      displayName?: string;
    }
    interface Provider<T> {
      (props: { value: T; children?: ReactNode }): ReactElement | null;
    }
    interface Consumer<T> {
      (props: { children: (value: T) => ReactNode }): ReactElement | null;
    }
    function createContext<T>(defaultValue: T): Context<T>;
  }
}

declare global {
  namespace JSX {
    interface Element extends React.ReactElement<any, any> { }
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
} 