// frontend/packages/ui/src/__tests__/design-system.test.tsx

/**
 * Design System Tests
 * 
 * This file contains tests to verify the design system implementation
 * in the Vilokanam-view platform.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { 
  Button, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  Header,
  CreatorHeader,
  StreamCard,
  CategoryCard,
  StatCard,
  ChatMessage
} from '../index';

describe('Design System Components', () => {
  describe('Button', () => {
    it('renders primary button correctly', () => {
      render(<Button variant="primary">Click Me</Button>);
      const button = screen.getByRole('button', { name: 'Click Me' });
      expect(button).toBeInTheDocument();
      // We can't easily test the exact styles, but we can test it renders
    });

    it('renders different variants', () => {
      render(
        <>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="outline">Outline</Button>
        </>
      );

      expect(screen.getByRole('button', { name: 'Primary' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Secondary' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Danger' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Outline' })).toBeInTheDocument();
    });
  });

  describe('Card Components', () => {
    it('renders basic card structure', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Test Card</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Card content</p>
          </CardContent>
        </Card>
      );

      expect(screen.getByText('Test Card')).toBeInTheDocument();
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });
  });

  describe('Header Components', () => {
    it('renders viewer header', () => {
      render(<Header />);
      expect(screen.getByText('Vilokanam')).toBeInTheDocument();
    });

    it('renders creator header', () => {
      render(<CreatorHeader />);
      expect(screen.getByText('Vilokanam Creator')).toBeInTheDocument();
    });
  });

  describe('Stream Components', () => {
    it('renders stream card', () => {
      render(
        <StreamCard
          title="Test Stream"
          creator="Test Creator"
          viewerCount={100}
          category="Gaming"
          isLive={true}
        />
      );

      expect(screen.getByText('Test Stream')).toBeInTheDocument();
      expect(screen.getByText('Test Creator')).toBeInTheDocument();
      expect(screen.getByText('100 viewers')).toBeInTheDocument();
      expect(screen.getByText('Gaming')).toBeInTheDocument();
      expect(screen.getByText('LIVE')).toBeInTheDocument();
    });

    it('renders category card', () => {
      render(<CategoryCard name="Gaming" streamCount={50} />);
      expect(screen.getByText('Gaming')).toBeInTheDocument();
      expect(screen.getByText('50 streams')).toBeInTheDocument();
    });

    it('renders stat card', () => {
      render(
        <StatCard 
          title="Viewers" 
          value="1,240" 
          change="+12%" 
        />
      );
      expect(screen.getByText('Viewers')).toBeInTheDocument();
      expect(screen.getByText('1,240')).toBeInTheDocument();
      expect(screen.getByText('+12% from last period')).toBeInTheDocument();
    });
  });

  describe('Chat Components', () => {
    it('renders chat message from others', () => {
      render(
        <ChatMessage 
          user="Viewer123" 
          message="Hello!" 
          time="12:45" 
          isOwn={false} 
        />
      );
      expect(screen.getByText('Viewer123')).toBeInTheDocument();
      expect(screen.getByText('Hello!')).toBeInTheDocument();
      expect(screen.getByText('12:45')).toBeInTheDocument();
    });

    it('renders own chat message', () => {
      render(
        <ChatMessage 
          user="Me" 
          message="Hi there!" 
          time="12:46" 
          isOwn={true} 
        />
      );
      expect(screen.getByText('Hi there!')).toBeInTheDocument();
      expect(screen.getByText('12:46')).toBeInTheDocument();
    });
  });
});