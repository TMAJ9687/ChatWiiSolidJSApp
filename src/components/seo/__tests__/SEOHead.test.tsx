import { render } from '@solidjs/testing-library';
import { describe, it, expect } from 'vitest';
import { MetaProvider } from '@solidjs/meta';
import SEOHead from '../SEOHead';

describe('SEOHead Component', () => {
  it('should render basic meta tags correctly', () => {
    const props = {
      title: 'Test Page',
      description: 'Test description for SEO',
      keywords: ['test', 'seo']
    };

    render(() => (
      <MetaProvider>
        <SEOHead {...props} />
      </MetaProvider>
    ));

    // Basic test to ensure component renders without errors
    expect(document.title).toContain('Test Page | ChatWii');
  });

  it('should include ChatWii in title when not present', () => {
    const props = {
      title: 'About Us',
      description: 'About our platform'
    };

    render(() => (
      <MetaProvider>
        <SEOHead {...props} />
      </MetaProvider>
    ));

    expect(document.title).toBe('About Us | ChatWii - Anonymous Chat Platform');
  });

  it('should not duplicate ChatWii in title when already present', () => {
    const props = {
      title: 'ChatWii - Home',
      description: 'Welcome to ChatWii'
    };

    render(() => (
      <MetaProvider>
        <SEOHead {...props} />
      </MetaProvider>
    ));

    expect(document.title).toBe('ChatWii - Home');
  });
});