import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { ProjectItem } from '../../types/erp';
import { ProjectsDirectory } from './ProjectsDirectory';
import { ProjectDetailsView } from './ProjectDetailsView';

export const ProjectManager: React.FC = () => {
  const { setActiveTab } = useERP();
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);

  const handleOpenInEntrySheet = (projectName: string) => {
    // If user wants to jump to requirements or entry sheet
    setActiveTab('requirements');
  };

  if (selectedProject) {
    return (
      <ProjectDetailsView
        project={selectedProject}
        onBack={() => setSelectedProject(null)}
        onOpenInEntrySheet={handleOpenInEntrySheet}
      />
    );
  }

  return (
    <ProjectsDirectory
      onSelectProject={(project) => setSelectedProject(project)}
      onOpenEntrySheetWithProject={handleOpenInEntrySheet}
    />
  );
};
