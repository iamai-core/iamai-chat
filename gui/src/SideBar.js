function SideBar() {
    return (
        <div className={"pop-up-1 " + className}>
          <div className="rectangle-8"></div>
          <Menu className="menu-instance"></Menu>
          <img className="rectangle-9" src="rectangle-90.svg" />
          <div className="settings">Settings </div>
          <img className="setting-line-light" src="setting-line-light0.svg" />
          <img className="add-square-light" src="add-square-light0.svg" />
          <div className="ellipse-6"></div>
          <div className="john-doe">John Doe </div>
          <div className="line-2"></div>
          <div className="line-1"></div>
      </div>
      
      <div className="chat-container">
        <aside className="sidebar">
          <div className="profile">
            <div className="user-icon"></div>
            <div className="user-name">John Doe</div>
          </div>
          <div className="sidebar-actions">
            <div className="action">Settings</div>
            <div className="action">Profile</div>
          </div>
        </aside>
          </div>
      );
}

export default SideBar;
