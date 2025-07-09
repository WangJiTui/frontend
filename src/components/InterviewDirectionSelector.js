const InterviewDirectionSelector = ({ selectedDirections, onDirectionChange }) => {
  const interviewDirections = [
    { id: "ai_engineer", name: "AI工程师", description: "机器学习、深度学习、自然语言处理、计算机视觉等" },
    { id: "data_engineer", name: "数据工程师", description: "数据管道、数据建模、数据治理、大数据处理等" },
    { id: "frontend_engineer", name: "前端工程师", description: "HTML/CSS/JavaScript、React/Vue、响应式设计、用户体验等" },
    { id: "backend_engineer", name: "后端工程师", description: "Java/Python/Node.js、数据库设计、API开发、系统架构等" },
    { id: "devops_engineer", name: "DevOps工程师", description: "CI/CD、容器化、云服务、自动化部署、监控运维等" },
    { id: "product_manager", name: "产品经理", description: "产品规划、需求分析、用户研究、项目管理等" },
    { id: "qa_engineer", name: "测试工程师", description: "功能测试、自动化测试、性能测试、质量保证等" }
  ];

  const handleDirectionToggle = (directionId) => {
    const newSelectedDirections = selectedDirections.includes(directionId)
      ? selectedDirections.filter(id => id !== directionId)
      : [...selectedDirections, directionId];
    
    onDirectionChange(newSelectedDirections);
  };

  const handleSelectAll = () => {
    if (selectedDirections.length === interviewDirections.length) {
      onDirectionChange([]);
    } else {
      onDirectionChange(interviewDirections.map(dir => dir.id));
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">选择面试方向</h3>
          <div className="flex space-x-2">
            <button
              onClick={handleSelectAll}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {selectedDirections.length === interviewDirections.length ? "取消全选" : "全选"}
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {interviewDirections.map((direction) => (
            <div
              key={direction.id}
              className={`relative flex items-start p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                selectedDirections.includes(direction.id)
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 bg-gray-50 hover:border-gray-300"
              }`}
              onClick={() => handleDirectionToggle(direction.id)}
            >
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  checked={selectedDirections.includes(direction.id)}
                  onChange={() => handleDirectionToggle(direction.id)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
              </div>
              <div className="ml-3 flex-1">
                <label className="text-sm font-medium text-gray-900 cursor-pointer">
                  {direction.name}
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  {direction.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        {selectedDirections.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              已选择 <span className="font-semibold">{selectedDirections.length}</span> 个方向：
              <span className="ml-2 text-blue-600">
                {selectedDirections
                  .map(id => interviewDirections.find(dir => dir.id === id)?.name)
                  .join(", ")}
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewDirectionSelector; 