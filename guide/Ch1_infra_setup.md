# 인프라 구축

- **VPC가 왜 필요한가**

AWS에 서버를 만들면 전 세계 수백만 명이 같은 AWS 인프라를 공유하고 있음

만약 네트워크가 분리되어 있지 않다면 - 다른 사람이 내 데이터베이스에 접근 가능

**VPC = AWS 안에 나만의 전용 네트워크를 만들어 다른 사람과 완전히 격리된 환경을 제공**

- **서브넷은 왜 2개씩 만드는 이유⭐**

`ap-northeast-2a`와 `ap-northeast-2c` 두 곳에 서브넷을 배치 

→하나의 데이터센터에 장애가 발생해도 다른 데이터센터에서 서비스를 계속 실행

⇒ **고가용성(High Availability)**

- 퍼블릭 vs 프라이빗 서브넷 차이

| **구분** | **퍼블릭 서브넷** | **프라이빗 서브넷** |
| --- | --- | --- |
| 인터넷에서 접근 | 가능 (IGW 경유) | 불가능 |
| 인터넷으로 나가기 | 가능 (IGW 경유) | 가능 (NAT GW 경유) |
| 배치할 리소스 | EC2 (웹 서버), NAT GW, ALB | RDS, ElastiCache, 내부 서버 |
| 라우트 테이블 | 0.0.0.0/0 → IGW | 0.0.0.0/0 → NAT GW |

**→ 데이터베이스(RDS)**는 반드시 **프라이빗 서브넷**

= 인터넷에서 직접 데이터베이스에 접근할 수 없도록 하는 것이 네트워크 수준의 첫 번째 보안 방어선

→ **NAT 게이트워이**는반드시 **퍼블릭 서브넷**

NAT Gateway = 프라이빗 서브넷의 트래픽을 받아서 **인터넷으로 전달**하는 역할

= 인터넷으로 전달하려면 NAT GW 자체가 인터넷에 접근할 수 있어야 한다

프라이빗 서브넷의 리소스(RDS 등)가 인터넷으로 **나가는 것만** 허용

- Node.js 20 LTS 설치하는 이유

ShopEasy API 서버는 Node.js로 작성되어 있기 때문

---

<aside>
📌

VPC 생성 항목

</aside>

![image.png](image.png)

<aside>
📌

퍼블릭/프라이빗 서브넷 2개씩 + 멀티 AZ

</aside>

![image.png](image%201.png)

![image.png](image%202.png)

![image.png](image%203.png)

![image.png](image%204.png)

<aside>
📌

퍼블릭 서브넷 자동 할당

</aside>

![image.png](image%205.png)

![image.png](image%206.png)

<aside>
📌

IGW 생성 + VPC 연결

</aside>

![image.png](image%207.png)

<aside>
📌

NAT Gateway 생성 위치/상태

</aside>

![image.png](image%208.png)

<aside>
📌

퍼블릭 RT 라우트 + Public 서브넷 연결

</aside>

![image.png](image%209.png)

![image.png](image%2010.png)

<aside>
📌

프라이빗 RT 라우트 + Private 서브넷 연결

</aside>

![image.png](image%2011.png)

![image.png](image%2012.png)

<aside>
📌

보안 그룹이 ShopEasy-VPC에 생성 + 규칙 포함

</aside>

![image.png](c1f5b7bc-e3ab-4d4b-9aad-60ba9c477876.png)

<aside>
📌

키 페어 생성 + pem 보관

</aside>

![image.png](image%2013.png)

<aside>
📌

인스턴스 상세 요약

</aside>

![image.png](image%2014.png)

<aside>
📌

SSH 접속된 터미널 + node 버전

</aside>

![image.png](image%2015.png)

<aside>
📌

API 응답 화면

</aside>

![image.png](image%2016.png)

![image.png](e513c1ec-0c06-4d21-a8f6-29e7e575d4da.png)