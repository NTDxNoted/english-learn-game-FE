import React from 'react';

interface PageHeadingProps {
  eyebrow: string;
  title: string;
  description: string;
}

export const PageHeading: React.FC<PageHeadingProps> = ({
  eyebrow,
  title,
  description,
}) => {
  return (
    <div className="page-heading-block">
      <p className="eyebrow-text">{eyebrow}</p>
      <h2 className="page-main-title">{title}</h2>
      <p className="page-main-desc">{description}</p>
    </div>
  );
};
