declare module 'react-middle-truncate' {
  import { Component } from 'react';

  interface MiddleTruncateProps {
    text: string;
    start?: number;
    end?: number;
    ellipsis?: string;
    className?: string;
  }

  export default class MiddleTruncate extends Component<MiddleTruncateProps> {}
}
