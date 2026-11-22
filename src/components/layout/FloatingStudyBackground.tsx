import React from 'react';
import { useLocation } from 'react-router-dom';
import {
  BookMarked,
  BookOpen,
  Feather,
  GraduationCap,
  NotebookPen,
  Pencil,
  PenTool,
  Trophy,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface FloatingToken {
  id: string;
  palette: 'lavender' | 'yellow' | 'mint' | 'peach' | 'blue' | 'pink';
  icon?: LucideIcon;
  letter?: string;
  durX: string;
  durY: string;
  durSpin: string;
  delayX: string;
  delayY: string;
  reverseX?: boolean;
  reverseY?: boolean;
}

const FLOATING_TOKENS: FloatingToken[] = [
  {
    id: 'book-open',
    palette: 'lavender',
    icon: BookOpen,
    durX: '17s',
    durY: '11.5s',
    durSpin: '5.2s',
    delayX: '-2.4s',
    delayY: '-4.1s',
  },
  {
    id: 'pencil',
    palette: 'yellow',
    icon: Pencil,
    durX: '19.5s',
    durY: '13s',
    durSpin: '6.1s',
    delayX: '-9.2s',
    delayY: '-1.8s',
    reverseX: true,
  },
  {
    id: 'pen-tool',
    palette: 'peach',
    icon: PenTool,
    durX: '15.5s',
    durY: '12.2s',
    durSpin: '4.8s',
    delayX: '-5.6s',
    delayY: '-8.3s',
    reverseY: true,
  },
  {
    id: 'book-marked',
    palette: 'mint',
    icon: BookMarked,
    durX: '21s',
    durY: '14.3s',
    durSpin: '6.6s',
    delayX: '-13.4s',
    delayY: '-6.5s',
    reverseX: true,
    reverseY: true,
  },
  {
    id: 'grad-cap',
    palette: 'blue',
    icon: GraduationCap,
    durX: '18.2s',
    durY: '10.8s',
    durSpin: '5.7s',
    delayX: '-7.1s',
    delayY: '-3.2s',
  },
  {
    id: 'tile-a',
    palette: 'pink',
    letter: 'A',
    durX: '22.5s',
    durY: '15.1s',
    durSpin: '7.2s',
    delayX: '-15.8s',
    delayY: '-10.4s',
    reverseX: true,
  },
  {
    id: 'notebook-pen',
    palette: 'yellow',
    icon: NotebookPen,
    durX: '16.4s',
    durY: '13.7s',
    durSpin: '5.4s',
    delayX: '-11.0s',
    delayY: '-2.7s',
    reverseY: true,
  },
  {
    id: 'feather',
    palette: 'lavender',
    icon: Feather,
    durX: '20.3s',
    durY: '12.6s',
    durSpin: '6.3s',
    delayX: '-4.3s',
    delayY: '-9.6s',
    reverseX: true,
    reverseY: true,
  },
  {
    id: 'tile-b',
    palette: 'mint',
    letter: 'B',
    durX: '23.8s',
    durY: '16.2s',
    durSpin: '6.9s',
    delayX: '-18.2s',
    delayY: '-5.1s',
  },
  {
    id: 'trophy',
    palette: 'peach',
    icon: Trophy,
    durX: '17.8s',
    durY: '11.9s',
    durSpin: '5.9s',
    delayX: '-8.7s',
    delayY: '-11.2s',
    reverseX: true,
  },
];

export const FloatingStudyBackground: React.FC = () => {
  const { pathname } = useLocation();

  // Tắt nền chuyển động trong màn chơi Webcam 60fps và khu vực bảng dữ liệu Admin
  if (pathname.startsWith('/game/') || pathname.startsWith('/admin')) {
    return null;
  }

  const isLobbyHome = pathname === '/';

  return (
    <div
      className={`pvp-study-bg ${isLobbyHome ? 'is-lobby' : 'is-subtle'}`}
      aria-hidden="true"
    >
      {FLOATING_TOKENS.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.id}
            className="pvp-bounce-x"
            style={{
              animationDuration: item.durX,
              animationDelay: item.delayX,
              animationDirection: item.reverseX ? 'alternate-reverse' : 'alternate',
            }}
          >
            <div
              className="pvp-bounce-y"
              style={{
                animationDuration: item.durY,
                animationDelay: item.delayY,
                animationDirection: item.reverseY ? 'alternate-reverse' : 'alternate',
              }}
            >
              <div
                className={`pvp-study-token pvp-token-${item.palette}`}
                style={{ animationDuration: item.durSpin }}
              >
                {Icon ? (
                  <Icon size={22} strokeWidth={2.1} />
                ) : (
                  <span className="pvp-token-letter">{item.letter}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
