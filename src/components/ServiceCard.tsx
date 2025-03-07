import React from 'react';

interface ServiceCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
}

export default function ServiceCard({ icon: Icon, title, description }: ServiceCardProps) {
  return (
    <div className="service-card animate-fade-in">
      <div className="hover-pulse">
        <Icon className="h-10 w-10 mx-auto mb-4" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-indigo-100">{description}</p>
    </div>
  );
}