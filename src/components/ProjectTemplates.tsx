'use client';

import { useState, useEffect } from 'react';
import { Plus, Star, Users, Briefcase, Home, Code, Megaphone, ShoppingCart, Folder, Eye, Copy } from 'lucide-react';

interface ProjectTemplate {
  _id: string;
  name: string;
  description?: string;
  category: string;
  color: string;
  todoLists: Array<{
    name: string;
    description?: string;
    tasks: Array<{
      title: string;
      description?: string;
      priority: string;
      estimatedDuration?: number;
    }>;
  }>;
  isPublic: boolean;
  usageCount: number;
  createdBy: string;
}

interface ProjectTemplatesProps {
  onSelectTemplate: (template: ProjectTemplate) => void;
  currentUserId: string;
}

export default function ProjectTemplates({ onSelectTemplate, currentUserId }: ProjectTemplatesProps) {
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const categories = [
    { id: 'all', name: 'All Templates', icon: Folder },
    { id: 'work', name: 'Work', icon: Briefcase },
    { id: 'personal', name: 'Personal', icon: Home },
    { id: 'development', name: 'Development', icon: Code },
    { id: 'marketing', name: 'Marketing', icon: Megaphone },
    { id: 'sales', name: 'Sales', icon: ShoppingCart },
    { id: 'other', name: 'Other', icon: Folder }
  ];

  useEffect(() => {
    fetchTemplates();
  }, [selectedCategory]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const url = selectedCategory === 'all' 
        ? '/api/project-templates?publicOnly=true'
        : `/api/project-templates?category=${selectedCategory}&publicOnly=true`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    const categoryData = categories.find(c => c.id === category);
    return categoryData ? categoryData.icon : Folder;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleUseTemplate = async (template: ProjectTemplate) => {
    try {
      // Increment usage count
      await fetch(`/api/project-templates/${template._id}/use`, {
        method: 'POST'
      });
      
      onSelectTemplate(template);
    } catch (error) {
      console.error('Error using template:', error);
      onSelectTemplate(template);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Project Templates</h2>
            <p className="text-gray-600 mt-1">Choose from pre-built project templates to get started quickly</p>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{category.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">Loading templates...</div>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12">
            <Folder className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
            <p className="text-gray-500">No templates available for the selected category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => {
              const CategoryIcon = getCategoryIcon(template.category);
              const totalTasks = template.todoLists.reduce((sum, list) => sum + list.tasks.length, 0);
              
              return (
                <div
                  key={template._id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleUseTemplate(template)}
                >
                  {/* Template Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: template.color }}
                      >
                        <CategoryIcon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{template.name}</h3>
                        <p className="text-sm text-gray-500 capitalize">{template.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 text-sm text-gray-500">
                      <Star className="w-4 h-4" />
                      <span>{template.usageCount}</span>
                    </div>
                  </div>

                  {/* Description */}
                  {template.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {template.description}
                    </p>
                  )}

                  {/* Template Stats */}
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <div className="flex items-center space-x-4">
                      <span>{template.todoLists.length} lists</span>
                      <span>{totalTasks} tasks</span>
                    </div>
                    {template.isPublic && (
                      <div className="flex items-center space-x-1">
                        <Eye className="w-4 h-4" />
                        <span>Public</span>
                      </div>
                    )}
                  </div>

                  {/* Sample Tasks Preview */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Sample Tasks:</h4>
                    {template.todoLists.slice(0, 2).map((list, listIndex) => (
                      <div key={listIndex}>
                        <div className="text-xs font-medium text-gray-600 mb-1">{list.name}</div>
                        {list.tasks.slice(0, 2).map((task, taskIndex) => (
                          <div key={taskIndex} className="flex items-center justify-between text-xs">
                            <span className="text-gray-700 truncate flex-1">{task.title}</span>
                            <span className={`px-2 py-1 rounded-full ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                          </div>
                        ))}
                        {list.tasks.length > 2 && (
                          <div className="text-xs text-gray-500">
                            +{list.tasks.length - 2} more tasks
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Use Template Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUseTemplate(template);
                    }}
                    className="w-full mt-4 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Use Template</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Custom Template */}
      <div className="p-6 border-t border-gray-200 bg-gray-50">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Don&apos;t see what you need?</h3>
          <p className="text-gray-600 mb-4">Create your own custom project template</p>
          <button className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 mx-auto">
            <Plus className="w-4 h-4" />
            <span>Create Template</span>
          </button>
        </div>
      </div>
    </div>
  );
}
