import React from 'react';
import styled from '@emotion/styled';

const HeaderContainer = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 3rem 2rem;
  text-align: center;
  border-radius: 8px;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 2.5rem;
  font-weight: bold;
`;

const Subtitle = styled.p`
  margin: 0.5rem 0 0 0;
  font-size: 1.1rem;
  opacity: 0.95;
`;

interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle }) => (
  <HeaderContainer>
    <Title>{title}</Title>
    {subtitle && <Subtitle>{subtitle}</Subtitle>}
  </HeaderContainer>
);

export default PageHeader;
