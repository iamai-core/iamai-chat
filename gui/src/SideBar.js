import menu_Img from "./../src/assets/menu_btn.PNG";
import add_Img from "./../src/assets/add_btn.PNG";
import gear_Icon from "./../src/assets/gear_icon.PNG";

function SideBar() {
    return (
    <div className="sidebar-overlay">
          <div className="sidebar">
            <nav>
              <button className="close-menu" type="Submit" >
                <img src={menu_Img} alt="close" />
              </button>
              <button className="add-button">
                <img src={add_Img} alt="Add" />
              </button>
            </nav>
            <hr className="divider" />
            <div className="profile-section">
              <div className="profile-circle"></div>
              <div className="profile-name">John Doe</div>
            </div>
            <button className="settings-button">
              <img src={gear_Icon} alt="Settings Icon" />
              <span>Settings</span>
            </button>
          </div>
      </div>
    );
}

export default SideBar;
